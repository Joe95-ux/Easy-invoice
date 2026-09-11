import { format, parseISO } from "date-fns";
import { newFormFieldId } from "@/lib/project-form-ids";
import {
  customFieldDefinitionsSchema,
  type CustomFieldAppliesTo,
  type CustomFieldDefinition,
  type CustomFieldType,
  type CustomFieldValues,
} from "@/lib/schemas/custom-fields";

const MAX_DEFINITIONS = 40;

export function normalizeCustomFieldDefinitions(raw: unknown): CustomFieldDefinition[] {
  if (!Array.isArray(raw)) return [];

  const parsed = customFieldDefinitionsSchema.safeParse(
    raw.slice(0, MAX_DEFINITIONS).map((item, index) => normalizeOneDefinition(item, index)),
  );
  if (!parsed.success) {
    // Best-effort: keep valid-looking rows even if some fail strict parse
    const fallback: CustomFieldDefinition[] = [];
    for (let i = 0; i < Math.min(raw.length, MAX_DEFINITIONS); i++) {
      const row = normalizeOneDefinition(raw[i], i);
      const single = customFieldDefinitionsSchema.safeParse([row]);
      if (single.success) fallback.push(single.data[0]!);
    }
    return fallback;
  }
  return parsed.data;
}

function normalizeOneDefinition(item: unknown, index: number): unknown {
  if (!item || typeof item !== "object") {
    return {
      id: newFormFieldId(),
      label: `Field ${index + 1}`,
      type: "text",
      required: false,
      appliesTo: ["invoice", "estimate"],
      showOnPdf: true,
    };
  }
  const row = item as Record<string, unknown>;
  const type = typeof row.type === "string" ? row.type : "text";
  const appliesRaw = Array.isArray(row.appliesTo) ? row.appliesTo : ["invoice", "estimate"];
  const appliesTo = appliesRaw.filter(
    (value): value is CustomFieldAppliesTo => value === "invoice" || value === "estimate",
  );
  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id : newFormFieldId(),
    label: typeof row.label === "string" ? row.label : `Field ${index + 1}`,
    type,
    required: row.required === true,
    options: Array.isArray(row.options) ? row.options : undefined,
    appliesTo: appliesTo.length > 0 ? appliesTo : ["invoice", "estimate"],
    showOnPdf: row.showOnPdf !== false,
  };
}

export function normalizeCustomFieldValues(raw: unknown): CustomFieldValues {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const values: CustomFieldValues = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key.trim()) continue;
    if (typeof value === "string") {
      values[key] = value.slice(0, 5000);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      values[key] = String(value);
    } else if (typeof value === "boolean") {
      values[key] = value ? "true" : "false";
    } else if (value == null) {
      continue;
    } else {
      values[key] = String(value).slice(0, 5000);
    }
  }
  return values;
}

export function definitionsForDocument(
  definitions: CustomFieldDefinition[],
  kind: CustomFieldAppliesTo,
) {
  return definitions.filter((field) => field.appliesTo.includes(kind));
}

export function sanitizeCustomFieldValuesForSave(
  definitions: CustomFieldDefinition[],
  kind: CustomFieldAppliesTo,
  raw: unknown,
): CustomFieldValues {
  const allowed = definitionsForDocument(definitions, kind);
  const incoming = normalizeCustomFieldValues(raw);
  const out: CustomFieldValues = {};

  for (const field of allowed) {
    const value = (incoming[field.id] ?? "").trim();
    if (!value) continue;
    if (field.type === "checkbox") {
      if (value === "true" || value === "1" || value.toLowerCase() === "yes") {
        out[field.id] = "true";
      }
      continue;
    }
    if (field.type === "select") {
      const ok = field.options?.some((option) => option.value === value);
      if (!ok) continue;
      out[field.id] = value;
      continue;
    }
    if (field.type === "number") {
      const num = Number(value);
      if (!Number.isFinite(num)) continue;
      out[field.id] = String(num);
      continue;
    }
    out[field.id] = value.slice(0, 5000);
  }

  return out;
}

export function validateRequiredCustomFields(
  definitions: CustomFieldDefinition[],
  kind: CustomFieldAppliesTo,
  values: CustomFieldValues,
): string | null {
  for (const field of definitionsForDocument(definitions, kind)) {
    if (!field.required) continue;
    const value = (values[field.id] ?? "").trim();
    if (field.type === "checkbox") {
      if (value !== "true") return `${field.label} is required`;
      continue;
    }
    if (!value) return `${field.label} is required`;
  }
  return null;
}

export function formatCustomFieldDisplayValue(
  field: CustomFieldDefinition,
  raw: string | undefined | null,
): string | null {
  const value = raw?.trim();
  if (!value) return null;

  if (field.type === "checkbox") {
    if (value !== "true") return null;
    return "Yes";
  }
  if (field.type === "select") {
    return field.options?.find((option) => option.value === value)?.label ?? value;
  }
  if (field.type === "date") {
    try {
      return format(parseISO(value), "PPP");
    } catch {
      return value;
    }
  }
  return value;
}

export type CustomFieldDisplayRow = {
  id: string;
  label: string;
  value: string;
  multiline: boolean;
};

/** Non-empty label/value pairs for UI and PDF (respects showOnPdf when forPdf). */
export function buildCustomFieldDisplayRows(
  definitions: CustomFieldDefinition[],
  kind: CustomFieldAppliesTo,
  values: CustomFieldValues | unknown,
  options?: { forPdf?: boolean },
): CustomFieldDisplayRow[] {
  const normalized = normalizeCustomFieldValues(values);
  const rows: CustomFieldDisplayRow[] = [];

  for (const field of definitionsForDocument(definitions, kind)) {
    if (options?.forPdf && field.showOnPdf === false) continue;
    const display = formatCustomFieldDisplayValue(field, normalized[field.id]);
    if (!display) continue;
    rows.push({
      id: field.id,
      label: field.label,
      value: display,
      multiline: field.type === "textarea",
    });
  }

  return rows;
}

export function createEmptyCustomFieldDefinition(
  type: CustomFieldType = "text",
): CustomFieldDefinition {
  return {
    id: newFormFieldId(),
    label: "New field",
    type,
    required: false,
    appliesTo: ["invoice", "estimate"],
    showOnPdf: true,
    ...(type === "select"
      ? {
          options: [
            { value: "option_a", label: "Option A" },
            { value: "option_b", label: "Option B" },
          ],
        }
      : {}),
  };
}

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  checkbox: "Checkbox",
};
