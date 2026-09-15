import type { AgingInvoiceRow, ClientRevenueRow } from "@/features/analytics/types";

function escapeCsv(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const body = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  // BOM helps Excel open UTF-8 correctly.
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function stampFilename(prefix: string) {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}

export function exportTopClientsCsv(
  clients: ClientRevenueRow[],
  currency: string,
  periodLabel: string,
) {
  downloadCsv(stampFilename("clients-revenue"), [
    ["Period", periodLabel],
    ["Client", `Revenue (${currency})`, "Invoices paid"],
    ...clients.map((row) => [row.name, row.revenue.toFixed(2), row.invoiceCount]),
  ]);
}

export function exportAgingCsv(invoices: AgingInvoiceRow[], currency: string) {
  downloadCsv(stampFilename("outstanding-aging"), [
    [
      "Invoice",
      "Client",
      "Bucket",
      "Days past due",
      `Balance due (${currency})`,
      "Due date",
      "Status",
    ],
    ...invoices.map((row) => [
      row.number,
      row.clientName,
      row.bucket,
      row.daysPastDue,
      row.balanceDue.toFixed(2),
      row.dueDate ?? "",
      row.status,
    ]),
  ]);
}
