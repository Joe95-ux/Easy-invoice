import "server-only";

import type { EstimateStatus, InvoiceStatus } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import {
  buildInvoicePaymentSummary,
  PAYMENT_METHOD_LABELS,
} from "@/lib/invoice-payments-utils";

export type ClientFinancialSummary = {
  totalBilled: number;
  totalCollected: number;
  outstanding: number;
  invoiceCount: number;
  estimateCount: number;
  avgDaysToPay: number | null;
  currency: string;
};

export type ClientInvoiceRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: number;
  balanceDue: number;
  currency: string;
  dueDate: string | null;
  createdAt: string;
};

export type ClientEstimateRow = {
  id: string;
  number: string;
  status: EstimateStatus;
  total: number;
  currency: string;
  validUntil: string | null;
  createdAt: string;
};

export type ClientActivityKind =
  | "payment"
  | "invoice_sent"
  | "estimate_sent"
  | "reminder_sent"
  | "payment_confirmation_sent"
  | "estimate_accepted";

export type ClientActivityRow = {
  id: string;
  kind: ClientActivityKind;
  occurredAt: string;
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  href?: string;
};

export type ClientReceiptRow = {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  method: string;
  paidAt: string;
};

export type ClientFinancialProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  notes: string | null;
  updatedAt: string;
  summary: ClientFinancialSummary;
  invoices: ClientInvoiceRow[];
  estimates: ClientEstimateRow[];
  receipts: ClientReceiptRow[];
  activity: ClientActivityRow[];
};

function toNumber(value: { toString(): string } | number): number {
  return typeof value === "number" ? value : parseFloat(value.toString());
}

const OUTSTANDING_STATUSES: InvoiceStatus[] = [
  "SENT",
  "VIEWED",
  "OVERDUE",
  "PARTIALLY_PAID",
];

export async function getClientFinancialProfile(
  clientId: string,
  companyId: string,
): Promise<ClientFinancialProfile | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId },
    include: {
      company: { select: { currency: true } },
      invoices: {
        orderBy: { createdAt: "desc" },
        include: {
          payments: {
            orderBy: { paidAt: "desc" },
            include: {
              confirmationEmails: { orderBy: { createdAt: "desc" } },
            },
          },
          reminders: { orderBy: { createdAt: "desc" } },
          installments: { orderBy: { sortOrder: "asc" } },
        },
      },
      estimates: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) return null;

  const currency = client.company.currency;
  let totalBilled = 0;
  let totalCollected = 0;
  let outstanding = 0;
  const daysToPay: number[] = [];
  const activity: ClientActivityRow[] = [];
  const receipts: ClientReceiptRow[] = [];

  const invoices: ClientInvoiceRow[] = client.invoices.map((invoice) => {
    const total = toNumber(invoice.total);
    const paymentSummary = buildInvoicePaymentSummary(invoice);
    const balanceDue = paymentSummary.balanceDue;

    if (invoice.status !== "CANCELLED") {
      totalBilled += total;
    }

    if (OUTSTANDING_STATUSES.includes(invoice.status)) {
      outstanding += balanceDue;
    }

    for (const payment of invoice.payments) {
      const amount = toNumber(payment.amount);
      totalCollected += amount;
      activity.push({
        id: `payment-${payment.id}`,
        kind: "payment",
        occurredAt: payment.paidAt.toISOString(),
        title: "Payment received",
        description: payment.receiptNumber
          ? `Receipt ${payment.receiptNumber} · Invoice ${invoice.number}`
          : `Invoice ${invoice.number}`,
        amount,
        currency: invoice.currency,
        href: `/invoices/${invoice.id}`,
      });

      if (payment.receiptNumber) {
        receipts.push({
          id: payment.id,
          receiptNumber: payment.receiptNumber,
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          amount,
          currency: invoice.currency,
          method: PAYMENT_METHOD_LABELS[payment.method],
          paidAt: payment.paidAt.toISOString(),
        });
      }

      for (const confirmation of payment.confirmationEmails) {
        activity.push({
          id: `payment-confirmation-${confirmation.id}`,
          kind: "payment_confirmation_sent",
          occurredAt: confirmation.createdAt.toISOString(),
          title: confirmation.isResend
            ? "Payment confirmation resent"
            : "Payment confirmation sent",
          description:
            confirmation.status === "FAILED"
              ? `${invoice.number} · ${confirmation.toEmail} · Failed: ${confirmation.error ?? "Unknown error"}`
              : `${invoice.number} · Receipt ${payment.receiptNumber ?? "—"} · ${confirmation.toEmail}`,
          amount,
          currency: invoice.currency,
          href: `/invoices/${invoice.id}`,
        });
      }
    }

    if (invoice.sentAt) {
      activity.push({
        id: `invoice-sent-${invoice.id}`,
        kind: "invoice_sent",
        occurredAt: invoice.sentAt.toISOString(),
        title: "Invoice sent",
        description: invoice.number,
        amount: total,
        currency: invoice.currency,
        href: `/invoices/${invoice.id}`,
      });

      if (invoice.paidAt && invoice.status === "PAID") {
        const sent = invoice.sentAt.getTime();
        const paid = invoice.paidAt.getTime();
        daysToPay.push(Math.max(0, Math.round((paid - sent) / (1000 * 60 * 60 * 24))));
      }
    }

    for (const reminder of invoice.reminders) {
      activity.push({
        id: `reminder-${reminder.id}`,
        kind: "reminder_sent",
        occurredAt: reminder.createdAt.toISOString(),
        title: "Payment reminder sent",
        description: `${invoice.number} · ${reminder.toEmail}`,
        href: `/invoices/${invoice.id}`,
      });
    }

    return {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      total,
      balanceDue,
      currency: invoice.currency,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
    };
  });

  const estimates: ClientEstimateRow[] = client.estimates.map((estimate) => {
    const total = toNumber(estimate.total);

    if (estimate.sentAt) {
      activity.push({
        id: `estimate-sent-${estimate.id}`,
        kind: "estimate_sent",
        occurredAt: estimate.sentAt.toISOString(),
        title: "Estimate sent",
        description: estimate.number,
        amount: total,
        currency: estimate.currency,
        href: `/estimates/${estimate.id}`,
      });
    }

    if (estimate.acceptedAt) {
      activity.push({
        id: `estimate-accepted-${estimate.id}`,
        kind: "estimate_accepted",
        occurredAt: estimate.acceptedAt.toISOString(),
        title: "Estimate accepted",
        description: estimate.number,
        amount: total,
        currency: estimate.currency,
        href: `/estimates/${estimate.id}`,
      });
    }

    return {
      id: estimate.id,
      number: estimate.number,
      status: estimate.status,
      total,
      currency: estimate.currency,
      validUntil: estimate.validUntil?.toISOString() ?? null,
      createdAt: estimate.createdAt.toISOString(),
    };
  });

  activity.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  receipts.sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );

  const avgDaysToPay =
    daysToPay.length > 0
      ? Math.round(daysToPay.reduce((sum, days) => sum + days, 0) / daysToPay.length)
      : null;

  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    address: client.address,
    city: client.city,
    state: client.state,
    zip: client.zip,
    country: client.country,
    notes: client.notes,
    updatedAt: client.updatedAt.toISOString(),
    summary: {
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
      invoiceCount: client.invoices.length,
      estimateCount: client.estimates.length,
      avgDaysToPay,
      currency,
    },
    invoices,
    estimates,
    receipts,
    activity,
  };
}
