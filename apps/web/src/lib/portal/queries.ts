import "server-only";

import type { EstimateStatus, InvoiceStatus } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import {
  ensureEstimatePublicToken,
  ensureInvoicePublicToken,
} from "@/lib/public-documents";
import { estimatePublicPath, invoicePublicPath } from "@/lib/document-tokens";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments-utils";
import { buildInvoiceTotals } from "@/lib/invoice-service";
import { frequencyLabel } from "@/lib/recurring-invoices-shared";
import type {
  PortalEstimateListItem,
  PortalInvoiceListItem,
  PortalUpcomingItem,
} from "@/lib/portal/types";

export type {
  PortalEstimateListItem,
  PortalInvoiceListItem,
  PortalUpcomingItem,
};

const PORTAL_INVOICE_STATUSES: InvoiceStatus[] = [
  "SENT",
  "VIEWED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
];

const PORTAL_ESTIMATE_STATUSES: EstimateStatus[] = [
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
];

export type PortalDashboard = {
  invoices: PortalInvoiceListItem[];
  estimates: PortalEstimateListItem[];
  upcoming: PortalUpcomingItem[];
  openBalance: number;
  currency: string;
};

function toNumber(value: { toNumber?: () => number } | number): number {
  if (typeof value === "number") return value;
  return value.toNumber?.() ?? Number(value);
}

export async function getPortalDashboard(input: {
  clientId: string;
  companyId: string;
}): Promise<PortalDashboard> {
  const [invoices, estimates, recurring, company] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        clientId: input.clientId,
        companyId: input.companyId,
        status: { in: PORTAL_INVOICE_STATUSES },
      },
      include: {
        payments: { select: { amount: true } },
        installments: {
          select: {
            id: true,
            amount: true,
            dueDate: true,
            label: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.estimate.findMany({
      where: {
        clientId: input.clientId,
        companyId: input.companyId,
        status: { in: PORTAL_ESTIMATE_STATUSES },
      },
      orderBy: [{ validUntil: "asc" }, { createdAt: "desc" }],
    }),
    prisma.recurringInvoice.findMany({
      where: {
        clientId: input.clientId,
        companyId: input.companyId,
        status: "ACTIVE",
      },
      include: {
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            description: true,
            sortOrder: true,
            sectionTitle: true,
            sectionSortOrder: true,
          },
          orderBy: [{ sectionSortOrder: "asc" }, { sortOrder: "asc" }],
        },
      },
      orderBy: { nextIssueDate: "asc" },
      take: 20,
    }),
    prisma.company.findUniqueOrThrow({
      where: { id: input.companyId },
      select: { currency: true },
    }),
  ]);

  const invoiceItems: PortalInvoiceListItem[] = [];
  const upcoming: PortalUpcomingItem[] = [];
  let openBalance = 0;

  for (const invoice of invoices) {
    const token = await ensureInvoicePublicToken(invoice.id, input.companyId);
    if (!token) continue;
    const href = invoicePublicPath(token);
    const summary = buildInvoicePaymentSummary({
      total: toNumber(invoice.total),
      dueDate: invoice.dueDate,
      payments: invoice.payments.map((payment) => ({
        amount: toNumber(payment.amount),
      })),
      installments: invoice.installments.map((row) => ({
        id: row.id,
        amount: toNumber(row.amount),
        dueDate: row.dueDate,
        label: row.label,
        sortOrder: row.sortOrder,
      })),
    });
    openBalance += summary.balanceDue;
    invoiceItems.push({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      total: toNumber(invoice.total),
      balanceDue: summary.balanceDue,
      currency: invoice.currency,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      issuedAt: invoice.issueDate.toISOString(),
      href,
    });

    if (
      summary.installments.length > 0 &&
      summary.nextDueDate &&
      summary.nextDueAmount != null &&
      summary.nextDueAmount > 0.001
    ) {
      const label =
        summary.installments.find((row) => !row.isPaid)?.label?.trim() ||
        "Installment";
      upcoming.push({
        id: `installment:${invoice.id}:${summary.nextDueDate.toISOString()}`,
        kind: "installment",
        title: invoice.number,
        subtitle: `${label} due`,
        amount: summary.nextDueAmount,
        currency: invoice.currency,
        date: summary.nextDueDate.toISOString(),
        href,
      });
    }
  }

  for (const schedule of recurring) {
    const { totals } = buildInvoiceTotals({
      lineItems: schedule.items.map((item, index) => ({
        description: item.description,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        sortOrder: item.sortOrder ?? index,
        sectionTitle: item.sectionTitle,
        sectionSortOrder: item.sectionSortOrder,
      })),
      taxRate: toNumber(schedule.taxRate),
      discount: toNumber(schedule.discount),
    });
    upcoming.push({
      id: `recurring:${schedule.id}`,
      kind: "recurring",
      title: schedule.name,
      subtitle: `Next ${frequencyLabel(schedule.frequency, schedule.interval).toLowerCase()} invoice`,
      amount: totals.total,
      currency: schedule.currency,
      date: schedule.nextIssueDate.toISOString(),
      href: null,
    });
  }

  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  const estimateItems: PortalEstimateListItem[] = [];
  for (const estimate of estimates) {
    const token = await ensureEstimatePublicToken(estimate.id, input.companyId);
    if (!token) continue;
    estimateItems.push({
      id: estimate.id,
      number: estimate.number,
      status: estimate.status,
      total: toNumber(estimate.total),
      currency: estimate.currency,
      validUntil: estimate.validUntil?.toISOString() ?? null,
      issuedAt: estimate.issueDate.toISOString(),
      href: estimatePublicPath(token),
    });
  }

  return {
    invoices: invoiceItems,
    estimates: estimateItems,
    upcoming: upcoming.slice(0, 25),
    openBalance,
    currency: company.currency || "USD",
  };
}
