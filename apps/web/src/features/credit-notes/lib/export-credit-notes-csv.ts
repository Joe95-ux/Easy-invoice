import {
  creditNoteKindLabel,
  creditNoteStatusLabel,
  type CreditNoteListRow,
} from "@/lib/credit-note-display";

export const CREDIT_NOTE_CSV_HEADERS = [
  "Number",
  "Invoice",
  "Client",
  "Issue date",
  "Kind",
  "Status",
  "Amount",
  "Currency",
] as const;

function escapeCsv(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function issueDateIso(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function rowForCreditNote(note: CreditNoteListRow): Array<string | number> {
  return [
    note.number,
    note.invoiceNumber,
    note.clientName ?? "",
    issueDateIso(note.issueDate),
    creditNoteKindLabel(note.kind),
    creditNoteStatusLabel(note.status),
    note.total,
    note.currency,
  ];
}

function csvFromRows(rows: Array<Array<string | number>>) {
  const body = [CREDIT_NOTE_CSV_HEADERS, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
  return "\uFEFF" + body;
}

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadCreditNotesCsv(notes: CreditNoteListRow[]) {
  const csv = csvFromRows(notes.map(rowForCreditNote));
  triggerDownload(csv, `credit-notes-${new Date().toISOString().slice(0, 10)}.csv`);
}
