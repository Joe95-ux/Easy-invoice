import type { CreditNoteKind, CreditNoteStatus, PaymentMethod } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit/service";
import { AuditAction, AuditCategory } from "@/lib/db";
import { allocateCreditNoteNumber } from "@/lib/document-numbers";
import { generatePublicToken } from "@/lib/document-tokens";
import { recordDocumentRevision } from "@/lib/document-revisions/service";
import {
  buildInvoiceTotals,
  documentTotalsPersistFields,
} from "@/lib/invoice-service";
import {
  buildInvoicePaymentSummary,
  invoiceSettlementInclude,
} from "@/lib/invoice-payments-utils";
import { refreshInvoicePaymentStatus } from "@/lib/invoice-payments";
import { normalizeAppliedTaxes } from "@/lib/tax-rates";
import { getTemplateById } from "@/lib/templates";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import type { CreateCreditNoteInput, UpdateCreditNoteInput } from "@/lib/schemas/credit-note";

export const CREDIT_NOTE_INCLUDE = {
  client: true,
  company: true,
  template: true,
  invoice: {
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      currency: true,
      publicToken: true,
    },
  },
  items: { orderBy: { sortOrder: "asc" as const } },
  refunds: { orderBy: { paidAt: "desc" as const } },
} as const;

type CreditNoteLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  sortOrder: number;
  sectionTitle?: string | null;
  sectionSortOrder?: number;
  taxable?: boolean;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumber(value: { toString(): string } | number): number {
  return typeof value === "number" ? value : parseFloat(value.toString());
}

export async function getCreditNoteForMember(id: string, companyId: string) {
  return prisma.creditNote.findFirst({
    where: { id, companyId },
    include: CREDIT_NOTE_INCLUDE,
  });
}

export async function listCreditNotesForMember(companyId: string, limit = 100) {
  return prisma.creditNote.findMany({
    where: { companyId },
    include: {
      client: { select: { id: true, name: true, email: true } },
      invoice: { select: { id: true, number: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function loadInvoiceForCredit(invoiceId: string, companyId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      client: true,
      company: true,
      items: { orderBy: { sortOrder: "asc" } },
      installments: { orderBy: { sortOrder: "asc" } },
      ...invoiceSettlementInclude,
    },
  });
}

function assertInvoiceCanBeCredited(status: string) {
  if (status === "DRAFT") {
    throw new Error("Send the invoice before issuing a credit note");
  }
  if (status === "CANCELLED") {
    throw new Error("Cancelled invoices cannot be credited");
  }
}

function creditCapacity(
  invoice: {
    total: { toString(): string } | number;
    payments?: Array<{ amount: { toString(): string } | number; kind?: string | null }>;
    creditNotes?: Array<{ total: { toString(): string } | number; status?: string | null }>;
    dueDate?: Date | null;
    installments?: Array<{
      id: string;
      dueDate: Date;
      amount: { toString(): string } | number;
      label: string | null;
      sortOrder: number;
    }>;
  },
  excludeCreditNoteId?: string,
) {
  const summary = buildInvoicePaymentSummary({
    ...invoice,
    creditNotes: (invoice.creditNotes ?? []).filter((note) => {
      if (!excludeCreditNoteId) return true;
      return (note as { id?: string }).id !== excludeCreditNoteId;
    }),
  });
  return summary.remainingInvoice;
}

async function buildPersistedTotals(
  invoice: NonNullable<Awaited<ReturnType<typeof loadInvoiceForCredit>>>,
  lineItems: CreditNoteLineInput[],
) {
  const built = buildInvoiceTotals({
    lineItems: lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxable: item.taxable !== false,
      sortOrder: item.sortOrder,
      sectionTitle: item.sectionTitle ?? null,
      sectionSortOrder: item.sectionSortOrder ?? 0,
    })),
    taxRate: Number(invoice.taxRate),
    taxes: normalizeAppliedTaxes(invoice.taxes),
    taxesProvided: true,
    discount: 0,
    taxInclusive: invoice.taxInclusive,
    taxCompound: invoice.taxCompound,
    currency: invoice.currency,
    homeCurrency: invoice.company.currency,
    exchangeRate: invoice.exchangeRate != null ? Number(invoice.exchangeRate) : null,
  });

  return {
    lineItems: built.lineItems,
    persist: documentTotalsPersistFields(built.built),
    total: built.totals.total,
  };
}

export async function createCreditNote(input: {
  companyId: string;
  memberId: string;
  data: CreateCreditNoteInput;
  kind?: CreditNoteKind;
}) {
  const invoice = await loadInvoiceForCredit(input.data.invoiceId, input.companyId);
  if (!invoice) throw new Error("Invoice not found");
  assertInvoiceCanBeCredited(invoice.status);

  if (input.data.templateId) {
    const template = await getTemplateById(input.data.templateId, input.companyId);
    if (!template) throw new Error("Template not found");
  }

  const totals = await buildPersistedTotals(invoice, input.data.lineItems);
  const capacity = creditCapacity(invoice);
  if (totals.total > capacity + 0.001) {
    throw new Error(
      `Credit cannot exceed the remaining invoice amount (${capacity.toFixed(2)} ${invoice.currency})`,
    );
  }
  if (totals.total <= 0.001) {
    throw new Error("Credit note total must be greater than zero");
  }

  const number = await allocateCreditNoteNumber(input.companyId);
  const issueNow = input.data.issue === true;
  const issueDate = input.data.issueDate ? new Date(input.data.issueDate) : new Date();

  const created = await prisma.creditNote.create({
    data: {
      companyId: input.companyId,
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      memberId: input.memberId,
      number,
      status: issueNow ? "ISSUED" : "DRAFT",
      kind: input.kind ?? "CREDIT",
      issueDate,
      currency: invoice.currency,
      ...totals.persist,
      exchangeRate: invoice.exchangeRate,
      exchangeRateDate: invoice.exchangeRateDate,
      exchangeRateSource: invoice.exchangeRateSource,
      exchangeRateLocked: true,
      reason: input.data.reason?.trim() || null,
      notes: input.data.notes?.trim() || invoice.notes,
      customFields: invoice.customFields ?? undefined,
      templateId: input.data.templateId ?? invoice.templateId,
      publicToken: generatePublicToken(),
      items: {
        create: totals.lineItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          taxable: item.taxable !== false,
          sortOrder: item.sortOrder ?? index,
          sectionTitle: item.sectionTitle ?? null,
          sectionSortOrder: item.sectionSortOrder ?? 0,
        })),
      },
    },
    include: CREDIT_NOTE_INCLUDE,
  });

  if (issueNow) {
    await refreshInvoicePaymentStatus(invoice.id, input.companyId);
    await recordAuditEvent({
      companyId: input.companyId,
      memberId: input.memberId,
      category: AuditCategory.DOCUMENT,
      action: AuditAction.CREDIT_NOTE_ISSUED,
      summary: `Issued credit note ${created.number} for invoice ${invoice.number}`,
      entityType: "CreditNote",
      entityId: created.id,
      metadata: { invoiceId: invoice.id, total: totals.total, kind: created.kind },
    });
    await recordDocumentRevision({
      companyId: input.companyId,
      documentType: "CREDIT_NOTE",
      documentId: created.id,
      memberId: input.memberId,
      source: "CREATE",
      summary: `Issued ${created.number}`,
    }).catch(() => undefined);
  }

  return getCreditNoteForMember(created.id, input.companyId);
}

export async function updateCreditNote(input: {
  id: string;
  companyId: string;
  memberId: string;
  data: UpdateCreditNoteInput;
}) {
  const existing = await getCreditNoteForMember(input.id, input.companyId);
  if (!existing) throw new Error("Credit note not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft credit notes can be edited");
  }

  const invoice = await loadInvoiceForCredit(existing.invoiceId, input.companyId);
  if (!invoice) throw new Error("Invoice not found");

  const lineItems = input.data.lineItems ?? existing.items.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    sortOrder: item.sortOrder,
    sectionTitle: item.sectionTitle,
    sectionSortOrder: item.sectionSortOrder,
    taxable: item.taxable,
  }));

  const totals = await buildPersistedTotals(invoice, lineItems);
  const capacity = creditCapacity(invoice);
  if (totals.total > capacity + 0.001) {
    throw new Error(
      `Credit cannot exceed the remaining invoice amount (${capacity.toFixed(2)} ${invoice.currency})`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.creditNoteLineItem.deleteMany({ where: { creditNoteId: existing.id } });
    await tx.creditNote.update({
      where: { id: existing.id },
      data: {
        reason: input.data.reason !== undefined ? input.data.reason?.trim() || null : existing.reason,
        notes: input.data.notes !== undefined ? input.data.notes?.trim() || null : existing.notes,
        issueDate: input.data.issueDate ? new Date(input.data.issueDate) : existing.issueDate,
        templateId:
          input.data.templateId !== undefined ? input.data.templateId : existing.templateId,
        ...totals.persist,
        items: {
          create: totals.lineItems.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            taxable: item.taxable !== false,
            sortOrder: item.sortOrder ?? index,
            sectionTitle: item.sectionTitle ?? null,
            sectionSortOrder: item.sectionSortOrder ?? 0,
          })),
        },
      },
    });
  });

  return getCreditNoteForMember(existing.id, input.companyId);
}

export async function issueCreditNote(input: {
  id: string;
  companyId: string;
  memberId: string;
  issueDate?: string;
}) {
  const existing = await getCreditNoteForMember(input.id, input.companyId);
  if (!existing) throw new Error("Credit note not found");
  if (existing.status === "ISSUED") return existing;
  if (existing.status === "CANCELLED") {
    throw new Error("Cancelled credit notes cannot be issued");
  }

  const invoice = await loadInvoiceForCredit(existing.invoiceId, input.companyId);
  if (!invoice) throw new Error("Invoice not found");
  assertInvoiceCanBeCredited(invoice.status);

  const capacity = creditCapacity(invoice);
  const total = toNumber(existing.total);
  if (total > capacity + 0.001) {
    throw new Error(
      `Credit cannot exceed the remaining invoice amount (${capacity.toFixed(2)} ${invoice.currency})`,
    );
  }

  await prisma.creditNote.update({
    where: { id: existing.id },
    data: {
      status: "ISSUED",
      issueDate: input.issueDate ? new Date(input.issueDate) : existing.issueDate,
    },
  });

  await refreshInvoicePaymentStatus(existing.invoiceId, input.companyId);
  await recordAuditEvent({
    companyId: input.companyId,
    memberId: input.memberId,
    category: AuditCategory.DOCUMENT,
    action: AuditAction.CREDIT_NOTE_ISSUED,
    summary: `Issued credit note ${existing.number} for invoice ${existing.invoice.number}`,
    entityType: "CreditNote",
    entityId: existing.id,
    metadata: { invoiceId: existing.invoiceId, total },
  });

  return getCreditNoteForMember(existing.id, input.companyId);
}

export async function cancelCreditNote(input: {
  id: string;
  companyId: string;
  memberId: string;
}) {
  const existing = await getCreditNoteForMember(input.id, input.companyId);
  if (!existing) throw new Error("Credit note not found");
  if (existing.status === "CANCELLED") return existing;
  if (existing.refunds.length > 0) {
    throw new Error("Cannot cancel a credit note that already has a refund");
  }

  await prisma.creditNote.update({
    where: { id: existing.id },
    data: { status: "CANCELLED" },
  });

  if (existing.status === "ISSUED") {
    await refreshInvoicePaymentStatus(existing.invoiceId, input.companyId);
  }

  await recordAuditEvent({
    companyId: input.companyId,
    memberId: input.memberId,
    category: AuditCategory.DOCUMENT,
    action: AuditAction.CREDIT_NOTE_CANCELLED,
    summary: `Cancelled credit note ${existing.number}`,
    entityType: "CreditNote",
    entityId: existing.id,
    metadata: { invoiceId: existing.invoiceId },
  });

  return getCreditNoteForMember(existing.id, input.companyId);
}

export async function deleteCreditNote(input: { id: string; companyId: string }) {
  const existing = await prisma.creditNote.findFirst({
    where: { id: input.id, companyId: input.companyId },
    select: { id: true, status: true },
  });
  if (!existing) throw new Error("Credit note not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only draft credit notes can be deleted");
  }
  await prisma.creditNote.delete({ where: { id: existing.id } });
}

export function invoiceLineItemsForCredit(
  items: Array<{
    description: string;
    quantity: { toString(): string } | number;
    unitPrice: { toString(): string } | number;
    taxable: boolean;
    sortOrder: number;
    sectionTitle: string | null;
    sectionSortOrder: number;
  }>,
): CreditNoteLineInput[] {
  return items.map((item) => ({
    description: item.description,
    quantity: toNumber(item.quantity),
    unitPrice: toNumber(item.unitPrice),
    sortOrder: item.sortOrder,
    sectionTitle: item.sectionTitle,
    sectionSortOrder: item.sectionSortOrder,
    taxable: item.taxable,
  }));
}

export async function voidInvoice(input: {
  invoiceId: string;
  companyId: string;
  memberId: string;
  reason?: string | null;
}) {
  const invoice = await loadInvoiceForCredit(input.invoiceId, input.companyId);
  if (!invoice) throw new Error("Invoice not found");
  assertInvoiceCanBeCredited(invoice.status);
  if (invoice.status === "CREDITED") {
    throw new Error("Invoice is already credited");
  }

  const summary = buildInvoicePaymentSummary(invoice);
  if (summary.amountPaid > 0.001) {
    throw new Error(
      "This invoice has payments. Issue a credit note and record a refund instead of voiding.",
    );
  }
  if (summary.remainingInvoice <= 0.001) {
    throw new Error("There is nothing left to void on this invoice");
  }

  const created = await createCreditNote({
    companyId: input.companyId,
    memberId: input.memberId,
    kind: "VOID",
    data: {
      invoiceId: invoice.id,
      reason: input.reason?.trim() || "Invoice voided",
      notes: invoice.notes,
      issue: true,
      lineItems: [
        {
          description: `Void of invoice ${invoice.number}`,
          quantity: 1,
          unitPrice: summary.remainingInvoice,
          sortOrder: 0,
          taxable: false,
        },
      ],
    },
  });

  await recordAuditEvent({
    companyId: input.companyId,
    memberId: input.memberId,
    category: AuditCategory.DOCUMENT,
    action: AuditAction.INVOICE_VOIDED,
    summary: `Voided invoice ${invoice.number} with credit note ${created?.number}`,
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: { creditNoteId: created?.id, total: summary.remainingInvoice },
  });

  return created;
}

export async function recordInvoiceRefund(input: {
  invoiceId: string;
  companyId: string;
  memberId: string;
  amount: number;
  paidAt?: Date;
  method?: PaymentMethod;
  reference?: string;
  note?: string;
  creditNoteId?: string | null;
  processStripe?: boolean;
}) {
  const amount = roundMoney(input.amount);
  if (amount <= 0) throw new Error("Refund amount must be greater than zero");

  const invoice = await loadInvoiceForCredit(input.invoiceId, input.companyId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "DRAFT") {
    throw new Error("Draft invoices cannot be refunded");
  }

  const summary = buildInvoicePaymentSummary(invoice);
  if (amount > summary.refundDue + 0.001) {
    throw new Error(
      summary.refundDue <= 0.001
        ? "There is no refund due on this invoice. Issue a credit note first."
        : `Refund cannot exceed the amount owed back (${summary.refundDue.toFixed(2)})`,
    );
  }

  if (input.creditNoteId) {
    const note = await prisma.creditNote.findFirst({
      where: {
        id: input.creditNoteId,
        invoiceId: invoice.id,
        companyId: input.companyId,
        status: "ISSUED",
      },
      select: { id: true },
    });
    if (!note) throw new Error("Credit note not found for this invoice");
  }

  let stripePaymentIntentId: string | null = null;
  const shouldProcessStripe =
    isStripeConfigured() &&
    input.processStripe !== false &&
    (input.method ?? "OTHER") === "CARD";
  if (shouldProcessStripe) {
    const cardPayment = await prisma.invoicePayment.findFirst({
      where: {
        invoiceId: invoice.id,
        kind: "PAYMENT",
        method: "CARD",
        stripePaymentIntentId: { not: null },
      },
      orderBy: { paidAt: "desc" },
      select: { stripePaymentIntentId: true },
    });
    if (cardPayment?.stripePaymentIntentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: cardPayment.stripePaymentIntentId,
          amount: Math.round(amount * 100),
          reason: "requested_by_customer",
        });
        stripePaymentIntentId = cardPayment.stripePaymentIntentId;
        if (refund.status === "failed") {
          throw new Error("Stripe refund failed. Record a manual refund instead.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stripe refund failed";
        throw new Error(
          `${message}. You can record a bank transfer or other manual refund instead.`,
        );
      }
    } else if (input.processStripe === true) {
      throw new Error("No card payment on this invoice to refund through Stripe");
    }
  }

  await prisma.invoicePayment.create({
    data: {
      invoiceId: invoice.id,
      memberId: input.memberId,
      amount,
      kind: "REFUND",
      paidAt: input.paidAt ?? new Date(),
      method: input.method ?? "OTHER",
      reference: input.reference ?? null,
      note: input.note ?? null,
      creditNoteId: input.creditNoteId ?? null,
      stripePaymentIntentId,
    },
  });

  const updated = await refreshInvoicePaymentStatus(invoice.id, input.companyId);
  await recordAuditEvent({
    companyId: input.companyId,
    memberId: input.memberId,
    category: AuditCategory.DOCUMENT,
    action: AuditAction.REFUND_RECORDED,
    summary: `Recorded ${amount.toFixed(2)} ${invoice.currency} refund on invoice ${invoice.number}`,
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: {
      amount,
      creditNoteId: input.creditNoteId ?? null,
      stripe: Boolean(stripePaymentIntentId),
    },
  });

  return updated;
}

export function creditNoteStatusLabel(status: CreditNoteStatus): string {
  if (status === "ISSUED") return "Issued";
  if (status === "CANCELLED") return "Cancelled";
  return "Draft";
}

export function creditNoteStatusVariant(
  status: CreditNoteStatus,
): "secondary" | "destructive" | "outline" | "success" | "info" | "warning" {
  switch (status) {
    case "ISSUED":
      return "success";
    case "CANCELLED":
      return "outline";
    default:
      return "secondary";
  }
}
