import "server-only";

import type { EstimateStatus, InvoiceStatus } from "@easy-invoice/db";
import { isProPlan } from "@/lib/billing/entitlements";
import { prisma } from "@/lib/db";
import {
  ensureCreditNotePublicToken,
  ensureEstimatePublicToken,
  ensureInvoicePublicToken,
  ensureStatementPublicToken,
} from "@/lib/public-documents";
import {
  creditNotePublicPath,
  estimatePublicPath,
  invoicePublicPath,
  statementPublicPath,
} from "@/lib/document-tokens";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments-utils";
import { buildInvoiceTotals } from "@/lib/invoice-service";
import { frequencyLabel } from "@/lib/recurring-invoices-shared";
import { normalizeAppliedTaxes } from "@/lib/tax-rates";
import type {
  PortalCreditNoteListItem,
  PortalEstimateListItem,
  PortalInvoiceListItem,
  PortalStatementListItem,
  PortalUpcomingItem,
} from "@/lib/portal/types";

export type {
  PortalCreditNoteListItem,
  PortalEstimateListItem,
  PortalInvoiceListItem,
  PortalStatementListItem,
  PortalUpcomingItem,
};

const PORTAL_INVOICE_STATUSES: InvoiceStatus[] = [
  "SENT",
  "VIEWED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CREDITED",
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
  creditNotes: PortalCreditNoteListItem[];
  statements: PortalStatementListItem[];
  upcoming: PortalUpcomingItem[];
  openBalance: number;
  currency: string;
  isPro: boolean;
};

function toNumber(value: { toNumber?: () => number } | number): number {
  if (typeof value === "number") return value;
  return value.toNumber?.() ?? Number(value);
}

export async function getPortalDashboard(input: {
  clientId: string;
  companyId: string;
}): Promise<PortalDashboard> {
  const [invoices, estimates, creditNotes, statements, recurring, company] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        clientId: input.clientId,
        companyId: input.companyId,
        status: { in: PORTAL_INVOICE_STATUSES },
      },
      include: {
        payments: { select: { amount: true, kind: true } },
        creditNotes: {
          where: { status: "ISSUED" },
          select: { total: true, status: true },
        },
        lateFees: { select: { amount: true } },
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
    prisma.creditNote.findMany({
      where: {
        companyId: input.companyId,
        status: "ISSUED",
        OR: [
          { clientId: input.clientId },
          { invoice: { clientId: input.clientId } },
        ],
      },
      select: {
        id: true,
        number: true,
        status: true,
        kind: true,
        total: true,
        currency: true,
        issueDate: true,
        invoice: { select: { number: true } },
      },
      orderBy: { issueDate: "desc" },
    }),
    prisma.clientStatement.findMany({
      where: {
        clientId: input.clientId,
        companyId: input.companyId,
      },
      select: {
        id: true,
        number: true,
        totalDue: true,
        currency: true,
        issuedAt: true,
      },
      orderBy: { issuedAt: "desc" },
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
            taxable: true,
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
      select: { currency: true, plan: true },
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
      total: invoice.total,
      dueDate: invoice.dueDate,
      payments: invoice.payments,
      creditNotes: invoice.creditNotes,
      lateFees: invoice.lateFees,
      installments: invoice.installments,
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
        taxable: item.taxable !== false,
      })),
      taxRate: toNumber(schedule.taxRate),
      taxes: normalizeAppliedTaxes(schedule.taxes),
      taxInclusive: schedule.taxInclusive,
      taxCompound: schedule.taxCompound,
      discount: toNumber(schedule.discount),
      currency: schedule.currency,
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

  const creditNoteItems: PortalCreditNoteListItem[] = [];
  for (const note of creditNotes) {
    const token = await ensureCreditNotePublicToken(note.id, input.companyId);
    if (!token) continue;
    creditNoteItems.push({
      id: note.id,
      number: note.number,
      status: note.status,
      kind: note.kind,
      total: toNumber(note.total),
      currency: note.currency,
      issuedAt: note.issueDate.toISOString(),
      invoiceNumber: note.invoice.number,
      href: creditNotePublicPath(token),
    });
  }

  const isPro = isProPlan(company.plan);
  const statementItems: PortalStatementListItem[] = [];
  if (isPro || statements.length > 0) {
    for (const statement of statements) {
      const token = await ensureStatementPublicToken(statement.id, input.companyId);
      if (!token) continue;
      statementItems.push({
        id: statement.id,
        number: statement.number,
        totalDue: toNumber(statement.totalDue),
        currency: statement.currency,
        issuedAt: statement.issuedAt.toISOString(),
        href: statementPublicPath(token),
      });
    }
  }

  return {
    invoices: invoiceItems,
    estimates: estimateItems,
    creditNotes: creditNoteItems,
    statements: statementItems,
    upcoming: upcoming.slice(0, 25),
    openBalance,
    currency: company.currency || "USD",
    isPro,
  };
}
