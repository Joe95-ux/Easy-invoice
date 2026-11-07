import type { CreditNoteKind, CreditNoteStatus } from "@easy-invoice/db";
import { formatUtcDateLabel, looksLikeUtcCalendarDate, toUtcIsoDate } from "@/lib/reminders/dates";

export type CreditNoteListRow = {
  id: string;
  number: string;
  status: CreditNoteStatus;
  kind: CreditNoteKind;
  total: string;
  currency: string;
  issueDate: string;
  clientName: string | null;
  invoiceId: string;
  invoiceNumber: string;
};

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

export function creditNoteKindLabel(kind: CreditNoteKind): string {
  return kind === "VOID" ? "Void" : "Credit";
}

export function formatCreditNoteMoney(amount: string | number, currency: string): string {
  const value = typeof amount === "number" ? amount : parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatCreditNoteDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  if (looksLikeUtcCalendarDate(date)) return formatUtcDateLabel(date);
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function serializeCreditNoteListRow(note: {
  id: string;
  number: string;
  status: CreditNoteStatus;
  kind: CreditNoteKind;
  total: { toString(): string } | number;
  currency: string;
  issueDate: Date;
  client: { name: string } | null;
  invoice: { id: string; number: string };
}): CreditNoteListRow {
  return {
    id: note.id,
    number: note.number,
    status: note.status,
    kind: note.kind,
    total: typeof note.total === "number" ? String(note.total) : note.total.toString(),
    currency: note.currency,
    issueDate: toUtcIsoDate(note.issueDate),
    clientName: note.client?.name ?? null,
    invoiceId: note.invoice.id,
    invoiceNumber: note.invoice.number,
  };
}
