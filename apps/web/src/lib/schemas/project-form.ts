import { z } from "zod";

export const formFieldOptionSchema = z.object({
  value: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(200).optional(),
});

export const formFieldTypeSchema = z.enum([
  "section",
  "page",
  "text",
  "email",
  "textarea",
  "url",
  "phone",
  "number",
  "date",
  "select",
  "radio",
  "checkbox",
  "yesno",
  "images",
]);

export const formFieldValidationSchema = z.object({
  minLength: z.number().int().min(0).max(10_000).optional(),
  maxLength: z.number().int().min(1).max(10_000).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().trim().max(200).optional(),
  message: z.string().trim().max(200).optional(),
});

export const formFieldVisibilitySchema = z.object({
  fieldId: z.string().min(1),
  op: z.enum(["eq", "neq", "empty", "notEmpty", "includes"]),
  value: z.string().max(500).optional(),
});

export const formFieldSchema = z
  .object({
    id: z.string().min(1),
    type: formFieldTypeSchema,
    label: z.string().trim().min(1).max(120),
    required: z.boolean().default(false),
    description: z.string().trim().max(500).optional().nullable(),
    options: z.array(formFieldOptionSchema).max(50).optional(),
    maxFiles: z.number().int().min(1).max(12).optional(),
    /** Layout on large screens. Defaults by type when omitted (legacy forms). */
    width: z.enum(["half", "full"]).optional(),
    validation: formFieldValidationSchema.optional().nullable(),
    /** Show this field only when the rule matches. */
    visibleWhen: formFieldVisibilitySchema.optional().nullable(),
  })
  .superRefine((field, ctx) => {
    if (
      (field.type === "select" || field.type === "radio" || field.type === "checkbox") &&
      (!field.options || field.options.length < 1)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one option",
        path: ["options"],
      });
    }
  });

export const createProjectFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  thankYouMessage: z.string().trim().max(1000).optional().nullable(),
  templateId: z.string().min(1).optional().nullable(),
  fields: z.array(formFieldSchema).max(60).optional(),
});

export const updateProjectFormSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  thankYouMessage: z.string().trim().max(1000).optional().nullable(),
  fields: z.array(formFieldSchema).min(1).max(60).optional(),
  status: z.enum(["DRAFT", "SENT", "COMPLETED", "CANCELLED"]).optional(),
});

export const submitProjectFormSchema = z.object({
  answers: z.record(z.string(), z.string()),
  submitterName: z.string().trim().max(200).optional().nullable(),
  submitterEmail: z.string().email().optional().or(z.literal("")).nullable(),
});

export const createFormTemplateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(500).optional().nullable(),
  fields: z.array(formFieldSchema).min(1).max(60),
});

export const updateFormTemplateSchema = createFormTemplateSchema.partial().extend({
  fields: z.array(formFieldSchema).min(1).max(60).optional(),
});

export type FormFieldOption = z.infer<typeof formFieldOptionSchema>;
export type FormFieldValidation = z.infer<typeof formFieldValidationSchema>;
export type FormFieldVisibility = z.infer<typeof formFieldVisibilitySchema>;
export type CreateProjectFormInput = z.infer<typeof createProjectFormSchema>;
export type UpdateProjectFormInput = z.infer<typeof updateProjectFormSchema>;
export type SubmitProjectFormInput = z.infer<typeof submitProjectFormSchema>;
export type CreateFormTemplateInput = z.infer<typeof createFormTemplateSchema>;
export type UpdateFormTemplateInput = z.infer<typeof updateFormTemplateSchema>;
export type FormFieldDef = z.infer<typeof formFieldSchema>;
export type FormFieldType = z.infer<typeof formFieldTypeSchema>;

export type FormFieldSectionGroup = {
  id: string;
  title: string;
  description?: string | null;
  fields: FormFieldDef[];
};

export type FormPageGroup = {
  id: string;
  title: string;
  description?: string | null;
  sections: FormFieldSectionGroup[];
};

const STRUCTURAL_TYPES = new Set<FormFieldType>(["section", "page"]);

/** Group answerable fields under section markers for the public fill UI. */
export function groupFormFieldsIntoSections(fields: FormFieldDef[]): FormFieldSectionGroup[] {
  const groups: FormFieldSectionGroup[] = [];
  let current: FormFieldSectionGroup | null = null;

  function ensureDefault() {
    if (!current) {
      current = {
        id: "details",
        title: "Details",
        description: null,
        fields: [],
      };
    }
  }

  for (const field of fields) {
    if (field.type === "page") continue;
    if (field.type === "section") {
      if (current && current.fields.length > 0) {
        groups.push(current);
      }
      current = {
        id: field.id,
        title: field.label,
        description: field.description ?? null,
        fields: [],
      };
      continue;
    }
    ensureDefault();
    current!.fields.push(field);
  }

  if (current && current.fields.length > 0) {
    groups.push(current);
  }

  return groups;
}

/** Split a form into pages (page markers). One page when none exist. */
export function groupFormFieldsIntoPages(fields: FormFieldDef[]): FormPageGroup[] {
  const hasPages = fields.some((field) => field.type === "page");
  if (!hasPages) {
    return [
      {
        id: "__page_1__",
        title: "Page 1",
        description: null,
        sections: groupFormFieldsIntoSections(fields),
      },
    ];
  }

  const pages: FormPageGroup[] = [];
  let buffer: FormFieldDef[] = [];
  let currentPage: { id: string; title: string; description: string | null } | null = null;

  function flush() {
    if (!currentPage && buffer.length === 0) return;
    const sections = groupFormFieldsIntoSections(buffer);
    const hasAnswerable = sections.some((section) => section.fields.length > 0);
    // Skip empty pages from consecutive page breaks.
    if (!hasAnswerable) {
      buffer = [];
      return;
    }
    const meta = currentPage ?? {
      id: `__page_${pages.length + 1}__`,
      title: `Page ${pages.length + 1}`,
      description: null,
    };
    pages.push({
      ...meta,
      sections,
    });
    buffer = [];
  }

  for (const field of fields) {
    if (field.type === "page") {
      flush();
      currentPage = {
        id: field.id,
        title: field.label,
        description: field.description ?? null,
      };
      continue;
    }
    buffer.push(field);
  }
  flush();

  return pages.length > 0
    ? pages
    : [
        {
          id: "__page_1__",
          title: "Page 1",
          description: null,
          sections: [],
        },
      ];
}

export function isStructuralFormField(field: FormFieldDef) {
  return STRUCTURAL_TYPES.has(field.type);
}

export function isAnswerableFormField(field: FormFieldDef) {
  return !STRUCTURAL_TYPES.has(field.type);
}

export function parseImageAnswer(value: string | undefined | null): string[] {
  if (!value?.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  } catch {
    // fall through — treat as single URL
  }
  return value.trim() ? [value.trim()] : [];
}

export function serializeImageAnswer(urls: string[]) {
  return JSON.stringify(urls);
}

export function parseCheckboxAnswer(value: string | undefined | null): string[] {
  return parseImageAnswer(value);
}

export function serializeCheckboxAnswer(values: string[]) {
  return JSON.stringify(values);
}

/** Plain-text answer for summaries, estimates, and response lists. */
export function formatFormAnswerPlain(
  field: FormFieldDef,
  raw: string | undefined | null,
): string | null {
  if (field.type === "images") {
    const urls = parseImageAnswer(raw);
    if (urls.length === 0) return null;
    return `${urls.length} image${urls.length === 1 ? "" : "s"} attached`;
  }

  if (field.type === "select" || field.type === "radio") {
    const option = field.options?.find((item) => item.value === raw);
    const label = option?.label ?? raw?.trim();
    return label || null;
  }

  if (field.type === "checkbox") {
    const values = parseCheckboxAnswer(raw);
    if (values.length === 0) return null;
    return values
      .map((value) => field.options?.find((option) => option.value === value)?.label ?? value)
      .join(", ");
  }

  if (field.type === "yesno") {
    const answer = raw?.trim().toLowerCase();
    if (answer === "yes") return "Yes";
    if (answer === "no") return "No";
    return null;
  }

  const value = raw?.trim();
  return value || null;
}
