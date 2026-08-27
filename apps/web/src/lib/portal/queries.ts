import "server-only";

import type { EstimateStatus, InvoiceStatus } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import {
  ensureEstimatePublicToken,
  ensureInvoicePublicToken,
} from "@/lib/public-documents";
import { estimatePublicPath, invoicePublicPath } from "@/lib/document-tokens";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments-utils";

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

export type PortalInvoiceListItem = {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: number;
  balanceDue: number;
  currency: string;
  dueDate: string | null;
  issuedAt: string;
  href: string;
};

export type PortalEstimateListItem = {
  id: string;
  number: string;
  status: EstimateStatus;
  total: number;
  currency: string;
  validUntil: string | null;
  issuedAt: string;
  href: string;
};

export type PortalDashboard = {
  invoices: PortalInvoiceListItem[];
  estimates: PortalEstimateListItem[];
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
  const [invoices, estimates, company] = await Promise.all([
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
      take: 50,
    }),
    prisma.estimate.findMany({
      where: {
        clientId: input.clientId,
        companyId: input.companyId,
        status: { in: PORTAL_ESTIMATE_STATUSES },
      },
      orderBy: [{ validUntil: "asc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.company.findUniqueOrThrow({
      where: { id: input.companyId },
      select: { currency: true },
    }),
  ]);

  const invoiceItems: PortalInvoiceListItem[] = [];
  let openBalance = 0;

  for (const invoice of invoices) {
    const token = await ensureInvoicePublicToken(invoice.id, input.companyId);
    if (!token) continue;
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
      href: invoicePublicPath(token),
    });
  }

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
    openBalance,
    currency: company.currency || "USD",
  };
}
