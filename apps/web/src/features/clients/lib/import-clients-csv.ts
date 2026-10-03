import { parseCsv } from "@/lib/csv/parse";
import { clientSchema, type ClientInput } from "@/lib/schemas/client";
import {
  CLIENT_EXPORT_FIELDS,
  type ClientExportFieldId,
} from "@/features/clients/lib/export-clients-csv";

/** Writable CSV columns for import (excludes derived export-only fields). */
export type ClientImportFieldId = Exclude<
  ClientExportFieldId,
  "invoiceCount" | "createdAt"
>;

export const CLIENT_IMPORT_FIELDS: {
  id: ClientImportFieldId;
  label: string;
  defaultSelected: boolean;
  required?: boolean;
}[] = CLIENT_EXPORT_FIELDS.filter(
  (field): field is (typeof CLIENT_EXPORT_FIELDS)[number] & {
    id: ClientImportFieldId;
  } => field.id !== "invoiceCount" && field.id !== "createdAt",
).map((field) => ({
  id: field.id as ClientImportFieldId,
  label: field.label,
  defaultSelected: field.id === "name" || field.id === "email",
  required: field.id === "name",
}));

export const DEFAULT_CLIENT_IMPORT_FIELD_IDS = CLIENT_IMPORT_FIELDS.filter(
  (field) => field.defaultSelected,
).map((field) => field.id);

export const MAX_CLIENT_IMPORT_ROWS = 500;

const HEADER_ALIASES: Record<string, ClientImportFieldId> = (() => {
  const map: Record<string, ClientImportFieldId> = {};
  for (const field of CLIENT_IMPORT_FIELDS) {
    map[normalizeHeader(field.id)] = field.id;
    map[normalizeHeader(field.label)] = field.id;
  }
  // Common CRM synonyms
  map.name = "name";
  map["client name"] = "name";
  map["full name"] = "name";
  map["e-mail"] = "email";
  map["email address"] = "email";
  map["phone number"] = "phone";
  map["postal code"] = "zip";
  map["zip code"] = "zip";
  map["state/region"] = "state";
  map["state / region"] = "state";
  map["hourly rate"] = "defaultHourlyRate";
  map["default hourly rate"] = "defaultHourlyRate";
  return map;
})();

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeImportEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type ParsedClientImportRow = {
  line: number;
  input: ClientInput;
  emailKey: string | null;
};

export type ClientImportParseResult = {
  rows: ParsedClientImportRow[];
  errors: Array<{ line: number; message: string }>;
  skippedEmpty: number;
};

/**
 * Map CSV headers → import field ids. Prefer selected fields; ignore unknowns.
 */
export function mapCsvHeadersToFields(
  headers: string[],
): Map<number, ClientImportFieldId> {
  const map = new Map<number, ClientImportFieldId>();
  const seen = new Set<ClientImportFieldId>();
  headers.forEach((header, index) => {
    const id = HEADER_ALIASES[normalizeHeader(header)];
    if (!id || seen.has(id)) return;
    seen.add(id);
    map.set(index, id);
  });
  return map;
}

export function parseClientsCsvText(
  text: string,
  options?: { maxRows?: number },
): ClientImportParseResult {
  const maxRows = options?.maxRows ?? MAX_CLIENT_IMPORT_ROWS;
  const { headers, rows } = parseCsv(text);
  if (headers.length === 0) {
    return {
      rows: [],
      errors: [{ line: 1, message: "CSV is empty or missing a header row" }],
      skippedEmpty: 0,
    };
  }

  const columnMap = mapCsvHeadersToFields(headers);
  if (![...columnMap.values()].includes("name")) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message: 'CSV must include a "Name" column (or header "name")',
        },
      ],
      skippedEmpty: 0,
    };
  }

  const parsedRows: ParsedClientImportRow[] = [];
  const errors: Array<{ line: number; message: string }> = [];
  let skippedEmpty = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const line = i + 2; // header is line 1
    if (parsedRows.length >= maxRows) {
      errors.push({
        line,
        message: `Row limit of ${maxRows} reached — remaining rows were not imported`,
      });
      break;
    }

    const cells = rows[i];
    const draft: Record<string, string> = {};
    for (const [colIndex, fieldId] of columnMap) {
      draft[fieldId] = (cells[colIndex] ?? "").trim();
    }

    const name = draft.name?.trim() ?? "";
    if (!name && Object.values(draft).every((v) => !v.trim())) {
      skippedEmpty += 1;
      continue;
    }

    const candidate = {
      name,
      email: draft.email ?? "",
      phone: draft.phone || undefined,
      address: draft.address || undefined,
      city: draft.city || undefined,
      state: draft.state || undefined,
      zip: draft.zip || undefined,
      country: draft.country?.trim() ? draft.country.trim() : "US",
      notes: draft.notes || undefined,
      defaultHourlyRate: draft.defaultHourlyRate || null,
    };

    const validated = clientSchema.safeParse(candidate);
    if (!validated.success) {
      const first = validated.error.issues[0];
      errors.push({
        line,
        message: first?.message ?? "Invalid row",
      });
      continue;
    }

    const emailRaw = validated.data.email?.trim() ?? "";
    parsedRows.push({
      line,
      input: validated.data,
      emailKey: emailRaw ? normalizeImportEmail(emailRaw) : null,
    });
  }

  return { rows: parsedRows, errors, skippedEmpty };
}
