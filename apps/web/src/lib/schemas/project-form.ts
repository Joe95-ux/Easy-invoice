import { z } from "zod";

export const formFieldOptionSchema = z.object({
  value: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(200).optional(),
});

export const formFieldTypeSchema = z.enum([
  "section",
  "text",
  "email",
  "textarea",
  "url",
  "select",
  "radio",
  "images",
]);

export const formFieldSchema = z
  .object({
    id: z.string().min(1),
    type: formFieldTypeSchema,
    label: z.string().trim().min(1).max(120),
    required: z.boolean().default(false),
    description: z.string().trim().max(500).optional().nullable(),
    options: z.array(formFieldOptionSchema).max(50).optional(),
    maxFiles: z.number().int().min(1).max(12).optional(),
  })
  .superRefine((field, ctx) => {
    if ((field.type === "select" || field.type === "radio") && (!field.options || field.options.length < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one option",
        path: ["options"],
      });
    }
  });

export const createProjectFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  templateId: z.string().min(1).optional().nullable(),
  fields: z.array(formFieldSchema).max(60).optional(),
});

export const updateProjectFormSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
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

export function isAnswerableFormField(field: FormFieldDef) {
  return field.type !== "section";
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
