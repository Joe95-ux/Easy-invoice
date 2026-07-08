import type { ReminderKind } from "@easy-invoice/db";
import type { ContentRevisionSource } from "@/lib/document-revisions/types";
import type { Decimal } from "@prisma/client/runtime/library";
import { formatMoney } from "@/lib/invoices";
import type { DocumentSnapshot, DocumentSnapshotLineItem } from "@/lib/document-revisions/types";

type MoneyInput = number | string | Decimal;

function toNumber(value: MoneyInput): number {
  return typeof value === "number" ? value : parseFloat(value.toString());
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatStatusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function invoiceToSnapshot(
  invoice: {
    status: DocumentSnapshot["status"];
    clientId: string | null;
    number: string;
    issueDate: Date;
    dueDate?: Date | null;
    currency: string;
    taxRate: MoneyInput;
    discount: MoneyInput;
    subtotal: MoneyInput;
    taxAmount: MoneyInput;
    total: MoneyInput;
    notes: string | null;
    templateId: string | null;
    remindersPaused?: boolean;
    installments?: Array<{
      dueDate: Date;
      amount: MoneyInput;
      label: string | null;
      sortOrder: number;
    }>;
    items: Array<{
      description: string;
      quantity: MoneyInput;
      unitPrice: MoneyInput;
      amount: MoneyInput;
      sortOrder: number;
    }>;
  },
  timeEntryIdsBySortOrder?: Map<number, string[]>,
): DocumentSnapshot {
  return {
    status: invoice.status,
    clientId: invoice.clientId,
    number: invoice.number,
    issueDate: toIsoDate(invoice.issueDate) ?? new Date().toISOString(),
    dueDate: toIsoDate(invoice.dueDate),
    currency: invoice.currency,
    taxRate: toNumber(invoice.taxRate),
    discount: toNumber(invoice.discount),
    subtotal: toNumber(invoice.subtotal),
    taxAmount: toNumber(invoice.taxAmount),
    total: toNumber(invoice.total),
    notes: invoice.notes,
    templateId: invoice.templateId,
    remindersPaused: invoice.remindersPaused,
    installments: invoice.installments?.map((row) => ({
      dueDate: toIsoDate(row.dueDate) ?? new Date().toISOString(),
      amount: toNumber(row.amount),
      label: row.label,
      sortOrder: row.sortOrder,
    })),
    lineItems: invoice.items.map((item) => ({
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      amount: toNumber(item.amount),
      sortOrder: item.sortOrder,
      timeEntryIds: timeEntryIdsBySortOrder?.get(item.sortOrder),
    })),
  };
}

export function estimateToSnapshot(estimate: {
  status: DocumentSnapshot["status"];
  clientId: string | null;
  number: string;
  issueDate: Date;
  validUntil?: Date | null;
  currency: string;
  taxRate: MoneyInput;
  discount: MoneyInput;
  subtotal: MoneyInput;
  taxAmount: MoneyInput;
  total: MoneyInput;
  notes: string | null;
  templateId: string | null;
  items: Array<{
    description: string;
    quantity: MoneyInput;
    unitPrice: MoneyInput;
    amount: MoneyInput;
    sortOrder: number;
  }>;
}): DocumentSnapshot {
  return {
    status: estimate.status,
    clientId: estimate.clientId,
    number: estimate.number,
    issueDate: toIsoDate(estimate.issueDate) ?? new Date().toISOString(),
    validUntil: toIsoDate(estimate.validUntil),
    currency: estimate.currency,
    taxRate: toNumber(estimate.taxRate),
    discount: toNumber(estimate.discount),
    subtotal: toNumber(estimate.subtotal),
    taxAmount: toNumber(estimate.taxAmount),
    total: toNumber(estimate.total),
    notes: estimate.notes,
    templateId: estimate.templateId,
    lineItems: estimate.items.map((item) => ({
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      amount: toNumber(item.amount),
      sortOrder: item.sortOrder,
    })),
  };
}

export function snapshotsEqual(a: DocumentSnapshot, b: DocumentSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function buildRevisionSummary(
  before: DocumentSnapshot | null,
  after: DocumentSnapshot,
  source: ContentRevisionSource,
  metadata?: {
    email?: string;
    restoredFrom?: number;
    paymentAmount?: number;
    amountPaid?: number;
  },
): string {
  if (source === "RESTORE") {
    return metadata?.restoredFrom
      ? `Restored from version ${metadata.restoredFrom}`
      : "Restored from saved version";
  }
  if (source === "STATUS" && metadata?.paymentAmount !== undefined) {
    const paidLabel =
      metadata.amountPaid !== undefined
        ? ` (${formatMoney(metadata.amountPaid, after.currency)} paid)`
        : "";
    return `Payment of ${formatMoney(metadata.paymentAmount, after.currency)} recorded${paidLabel}`;
  }
  if (source === "STATUS" && before && before.status !== after.status) {
    return `Status changed to ${formatStatusLabel(after.status)}`;
  }

  const parts: string[] = [];

  if (before && before.status !== after.status) {
    parts.push(`Status changed to ${formatStatusLabel(after.status)}`);
  }

  if (!before || before.total !== after.total) {
    if (before) {
      parts.push(
        `Total ${formatMoney(before.total, before.currency)} → ${formatMoney(after.total, after.currency)}`,
      );
    }
  }

  if (!before || JSON.stringify(before.lineItems) !== JSON.stringify(after.lineItems)) {
    parts.push("Line items updated");
  }

  if (before && before.notes !== after.notes) {
    parts.push("Notes updated");
  }

  if (
    before &&
    (before.dueDate !== after.dueDate || before.validUntil !== after.validUntil)
  ) {
    parts.push("Dates updated");
  }

  if (before && before.templateId !== after.templateId) {
    parts.push("Template updated");
  }

  return parts.length > 0 ? parts.join(" · ") : "Document updated";
}

export function snapshotLineItemsToCreate(
  lineItems: DocumentSnapshotLineItem[],
): Array<{
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
}> {
  return lineItems.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.amount,
    sortOrder: item.sortOrder,
  }));
}

export function buildReminderRevisionSummary(
  kind: ReminderKind | undefined,
  email: string,
): string {
  switch (kind) {
    case "BEFORE_DUE":
      return `Automatic before-due reminder sent to ${email}`;
    case "ON_DUE":
      return `Automatic due-date reminder sent to ${email}`;
    case "OVERDUE":
      return `Automatic overdue reminder sent to ${email}`;
    case "MANUAL":
      return `Payment reminder sent to ${email}`;
    default:
      return `Payment reminder sent to ${email}`;
  }
}

export function buildPaymentConfirmationRevisionSummary(input: {
  toEmail: string;
  receiptNumber: string;
  isResend: boolean;
}): string {
  if (input.isResend) {
    return `Payment confirmation resent to ${input.toEmail} (receipt ${input.receiptNumber})`;
  }
  return `Payment confirmation sent to ${input.toEmail} (receipt ${input.receiptNumber})`;
}
