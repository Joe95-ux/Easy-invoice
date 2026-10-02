import type { ClientListItem } from "@/lib/clients";

export type ClientExportFieldId =
  | "name"
  | "email"
  | "phone"
  | "address"
  | "city"
  | "state"
  | "zip"
  | "country"
  | "notes"
  | "defaultHourlyRate"
  | "invoiceCount"
  | "createdAt";

export type ClientExportField = {
  id: ClientExportFieldId;
  label: string;
  /** Checked when the export dialog opens. */
  defaultSelected: boolean;
};

export const CLIENT_EXPORT_FIELDS: ClientExportField[] = [
  { id: "name", label: "Name", defaultSelected: true },
  { id: "email", label: "Email", defaultSelected: true },
  { id: "phone", label: "Phone", defaultSelected: false },
  { id: "address", label: "Address", defaultSelected: false },
  { id: "city", label: "City", defaultSelected: false },
  { id: "state", label: "State / region", defaultSelected: false },
  { id: "zip", label: "ZIP / postal code", defaultSelected: false },
  { id: "country", label: "Country", defaultSelected: false },
  { id: "notes", label: "Notes", defaultSelected: false },
  { id: "defaultHourlyRate", label: "Default hourly rate", defaultSelected: false },
  { id: "invoiceCount", label: "Invoice count", defaultSelected: false },
  { id: "createdAt", label: "Created date", defaultSelected: false },
];

export const DEFAULT_CLIENT_EXPORT_FIELD_IDS = CLIENT_EXPORT_FIELDS.filter(
  (field) => field.defaultSelected,
).map((field) => field.id);

function escapeCsv(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function fieldValue(
  client: ClientListItem,
  fieldId: ClientExportFieldId,
): string | number | null {
  switch (fieldId) {
    case "name":
      return client.name;
    case "email":
      return client.email;
    case "phone":
      return client.phone;
    case "address":
      return client.address;
    case "city":
      return client.city;
    case "state":
      return client.state;
    case "zip":
      return client.zip;
    case "country":
      return client.country;
    case "notes":
      return client.notes;
    case "defaultHourlyRate":
      return client.defaultHourlyRate == null
        ? null
        : Number(client.defaultHourlyRate);
    case "invoiceCount":
      return client._count.invoices;
    case "createdAt": {
      const value = client.createdAt as Date | string;
      if (value instanceof Date) return value.toISOString().slice(0, 10);
      return String(value).slice(0, 10);
    }
    default:
      return null;
  }
}

export function downloadClientsCsv(
  clients: ClientListItem[],
  fieldIds: ClientExportFieldId[],
) {
  const fields = CLIENT_EXPORT_FIELDS.filter((field) => fieldIds.includes(field.id));
  if (fields.length === 0) return;

  const header = fields.map((field) => field.label);
  const rows = clients.map((client) =>
    fields.map((field) => fieldValue(client, field.id)),
  );

  const body = [header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
