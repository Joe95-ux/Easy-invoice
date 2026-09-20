import {
  isAnswerableFormField,
  parseCheckboxAnswer,
  parseImageAnswer,
  type FormFieldDef,
  type FormFieldVisibility,
} from "@/lib/schemas/project-form";

export function isFieldVisible(
  field: FormFieldDef,
  answers: Record<string, string>,
  allFields: FormFieldDef[],
): boolean {
  const rule = field.visibleWhen;
  if (!rule?.fieldId) return true;
  const source = allFields.find((item) => item.id === rule.fieldId);
  if (!source || !isAnswerableFormField(source)) return true;
  if (!isFieldVisible(source, answers, allFields)) return false;
  return matchesVisibilityRule(rule, answers[rule.fieldId] ?? "", source);
}

function matchesVisibilityRule(
  rule: FormFieldVisibility,
  raw: string,
  source: FormFieldDef,
): boolean {
  const empty = !raw.trim() || (source.type === "checkbox" && parseCheckboxAnswer(raw).length === 0);

  switch (rule.op) {
    case "empty":
      return empty;
    case "notEmpty":
      return !empty;
    case "eq":
      return normalizeAnswer(raw, source) === normalizeRuleValue(rule.value, source);
    case "neq":
      return normalizeAnswer(raw, source) !== normalizeRuleValue(rule.value, source);
    case "includes": {
      if (source.type === "checkbox") {
        return parseCheckboxAnswer(raw).includes(rule.value ?? "");
      }
      return raw.includes(rule.value ?? "");
    }
    default:
      return true;
  }
}

function normalizeAnswer(raw: string, source: FormFieldDef) {
  if (source.type === "yesno") return raw.trim().toLowerCase();
  return raw;
}

function normalizeRuleValue(value: string | undefined, source: FormFieldDef) {
  if (source.type === "yesno") return (value ?? "").trim().toLowerCase();
  return value ?? "";
}

export function validateFieldAnswer(
  field: FormFieldDef,
  raw: string | undefined,
): string | null {
  if (!isAnswerableFormField(field)) return null;

  const value = raw ?? "";
  const custom = field.validation?.message?.trim();

  if (field.type === "images") {
    if (field.required && parseImageAnswer(value).length === 0) {
      return custom || `${field.label} is required`;
    }
    return null;
  }

  if (field.type === "checkbox") {
    const selected = parseCheckboxAnswer(value);
    if (field.required && selected.length === 0) {
      return custom || `${field.label} is required`;
    }
    return null;
  }

  const trimmed = value.trim();
  if (field.required && !trimmed) {
    return custom || `${field.label} is required`;
  }
  if (!trimmed) return null;

  const rules = field.validation;
  if (rules?.minLength != null && trimmed.length < rules.minLength) {
    return custom || `Must be at least ${rules.minLength} characters`;
  }
  if (rules?.maxLength != null && trimmed.length > rules.maxLength) {
    return custom || `Must be at most ${rules.maxLength} characters`;
  }

  if (field.type === "number" || rules?.min != null || rules?.max != null) {
    const num = Number(trimmed);
    if (field.type === "number" && !Number.isFinite(num)) {
      return custom || "Enter a valid number";
    }
    if (Number.isFinite(num)) {
      if (rules?.min != null && num < rules.min) {
        return custom || `Must be at least ${rules.min}`;
      }
      if (rules?.max != null && num > rules.max) {
        return custom || `Must be at most ${rules.max}`;
      }
    }
  }

  if (field.type === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return custom || "Enter a valid email";
    }
  }

  if (field.type === "url") {
    try {
      // eslint-disable-next-line no-new
      new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    } catch {
      return custom || "Enter a valid URL";
    }
  }

  if (field.type === "phone") {
    const digits = trimmed.replace(/[^\d+]/g, "");
    if (digits.replace(/\D/g, "").length < 7) {
      return custom || "Enter a valid phone number";
    }
  }

  if (rules?.pattern) {
    try {
      const re = new RegExp(rules.pattern);
      if (!re.test(trimmed)) {
        return custom || "Invalid format";
      }
    } catch {
      // ignore bad patterns authored in builder
    }
  }

  return null;
}

export function validateFormAnswers(
  fields: FormFieldDef[],
  answers: Record<string, string>,
): string | null {
  for (const field of fields) {
    if (!isAnswerableFormField(field)) continue;
    if (!isFieldVisible(field, answers, fields)) continue;
    const error = validateFieldAnswer(field, answers[field.id]);
    if (error) return error;
  }
  return null;
}
