import { format, isValid, parseISO } from "date-fns";
import type { ZodError } from "zod";
import { newFormFieldId } from "@/lib/project-form-ids";
import {
  customFieldDefinitionsSchema,
  type CustomFieldAppliesTo,
  type CustomFieldDefinition,
  type CustomFieldType,
  type CustomFieldValues,
} from "@/lib/schemas/custom-fields";

export const MAX_CUSTOM_FIELD_DEFINITIONS = 40;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeCustomFieldDefinitions(raw: unknown): CustomFieldDefinition[] {
  if (!Array.isArray(raw)) return [];

  const parsed = customFieldDefinitionsSchema.safeParse(
    raw
      .slice(0, MAX_CUSTOM_FIELD_DEFINITIONS)
      .map((item, index) => normalizeOneDefinition(item, index)),
  );
  if (!parsed.success) {
    const fallback: CustomFieldDefinition[] = [];
    for (let i = 0; i < Math.min(raw.length, MAX_CUSTOM_FIELD_DEFINITIONS); i++) {
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
      enabled: true,
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
  const description =
    typeof row.description === "string" && row.description.trim()
      ? row.description.trim().slice(0, 300)
      : null;
  const defaultValue =
    typeof row.defaultValue === "string" && row.defaultValue.trim()
      ? row.defaultValue.trim().slice(0, 5000)
      : null;
  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id : newFormFieldId(),
    label: typeof row.label === "string" ? row.label : `Field ${index + 1}`,
    description,
    type,
    required: row.required === true,
    enabled: row.enabled !== false,
    defaultValue:
      type === "checkbox"
        ? defaultValue === "true"
          ? "true"
          : null
        : type === "select" && defaultValue
          ? Array.isArray(row.options) &&
            row.options.some(
              (option) =>
                option &&
                typeof option === "object" &&
                (option as { value?: unknown }).value === defaultValue,
            )
            ? defaultValue
            : null
          : defaultValue,
    options: type === "select" && Array.isArray(row.options) ? row.options : undefined,
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
  return definitions.filter(
    (field) => field.enabled !== false && field.appliesTo.includes(kind),
  );
}

/** Prefill document form values from definition defaults (create flows). */
export function seedCustomFieldDefaults(
  definitions: CustomFieldDefinition[],
  kind: CustomFieldAppliesTo,
  existing?: CustomFieldValues | null,
): CustomFieldValues {
  const values = normalizeCustomFieldValues(existing);
  for (const field of definitionsForDocument(definitions, kind)) {
    if (Object.prototype.hasOwnProperty.call(values, field.id)) continue;
    const def = field.defaultValue?.trim();
    if (!def) continue;
    if (field.type === "checkbox" && def !== "true") continue;
    if (
      field.type === "select" &&
      !field.options?.some((option) => option.value === def)
    ) {
      continue;
    }
    values[field.id] = def;
  }
  return values;
}

export type SanitizeCustomFieldsResult =
  | { ok: true; values: CustomFieldValues }
  | { ok: false; error: string };

export function sanitizeCustomFieldValuesForSave(
  definitions: CustomFieldDefinition[],
  kind: CustomFieldAppliesTo,
  raw: unknown,
): SanitizeCustomFieldsResult {
  const allowed = definitionsForDocument(definitions, kind);
  const incoming = normalizeCustomFieldValues(raw);
  const out: CustomFieldValues = {};

  for (const field of allowed) {
    const value = (incoming[field.id] ?? "").trim();
    if (!value) continue;

    if (field.type === "checkbox") {
      if (value === "true" || value === "1" || value.toLowerCase() === "yes") {
        out[field.id] = "true";
      } else if (value === "false" || value === "0" || value.toLowerCase() === "no") {
        continue;
      } else {
        return { ok: false, error: `${field.label} must be yes or no` };
      }
      continue;
    }

    if (field.type === "select") {
      const ok = field.options?.some((option) => option.value === value);
      if (!ok) {
        return { ok: false, error: `${field.label} has an invalid option` };
      }
      out[field.id] = value;
      continue;
    }

    if (field.type === "number") {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        return { ok: false, error: `${field.label} must be a number` };
      }
      out[field.id] = String(num);
      continue;
    }

    if (field.type === "date") {
      if (!ISO_DATE_RE.test(value) || !isValid(parseISO(value))) {
        return { ok: false, error: `${field.label} must be a valid date` };
      }
      out[field.id] = value;
      continue;
    }

    out[field.id] = value.slice(0, 5000);
  }

  return { ok: true, values: out };
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

/** Sanitize + required check in one step for API/create flows. */
export function prepareCustomFieldsForSave(
  definitions: CustomFieldDefinition[],
  kind: CustomFieldAppliesTo,
  raw: unknown,
): SanitizeCustomFieldsResult {
  const sanitized = sanitizeCustomFieldValuesForSave(definitions, kind, raw);
  if (!sanitized.ok) return sanitized;
  const requiredError = validateRequiredCustomFields(definitions, kind, sanitized.values);
  if (requiredError) return { ok: false, error: requiredError };
  return sanitized;
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
      const parsed = parseISO(value);
      if (!isValid(parsed)) return value;
      return format(parsed, "PPP");
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
  const seen = new Set<string>();

  for (const field of definitionsForDocument(definitions, kind)) {
    seen.add(field.id);
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

  // Keep values for removed definitions visible (historical documents).
  for (const [id, raw] of Object.entries(normalized)) {
    if (seen.has(id)) continue;
    const value = raw.trim();
    if (!value) continue;
    if (value === "true") {
      rows.push({ id, label: "Removed field", value: "Yes", multiline: false });
      continue;
    }
    rows.push({
      id,
      label: "Removed field",
      value,
      multiline: value.includes("\n"),
    });
  }

  return rows;
}

export function createEmptyCustomFieldDefinition(
  type: CustomFieldType = "text",
): CustomFieldDefinition {
  return {
    id: newFormFieldId(),
    label: "",
    description: null,
    type,
    required: false,
    enabled: true,
    defaultValue: null,
    appliesTo: ["invoice", "estimate"],
    showOnPdf: true,
    ...(type === "select"
      ? {
          options: [
            createCustomFieldOption("Option A"),
            createCustomFieldOption("Option B"),
          ],
        }
      : {}),
  };
}

export function createCustomFieldOption(label = "New option") {
  return { value: newFormFieldId(), label };
}

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  number: "Number",
  date: "Date",
  select: "Dropdown",
  checkbox: "Checkbox",
};

/** First user-facing Zod issue message from a failed definitions parse. */
export function firstCustomFieldDefinitionsError(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid custom fields";
  if (issue.message === "Required" || issue.code === "too_small") {
    return "Each field needs a label";
  }
  return issue.message;
}
