import { z } from "zod";

export const formFieldTypeSchema = z.enum(["text", "email", "textarea", "url"]);

export const formFieldSchema = z.object({
  id: z.string().min(1),
  type: formFieldTypeSchema,
  label: z.string().trim().min(1).max(120),
  required: z.boolean().default(false),
});

export const createProjectFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  templateId: z.string().min(1).optional().nullable(),
  fields: z.array(formFieldSchema).max(40).optional(),
});

export const updateProjectFormSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  fields: z.array(formFieldSchema).min(1).max(40).optional(),
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
  fields: z.array(formFieldSchema).min(1).max(40),
});

export const updateFormTemplateSchema = createFormTemplateSchema.partial().extend({
  fields: z.array(formFieldSchema).min(1).max(40).optional(),
});

export type CreateProjectFormInput = z.infer<typeof createProjectFormSchema>;
export type UpdateProjectFormInput = z.infer<typeof updateProjectFormSchema>;
export type SubmitProjectFormInput = z.infer<typeof submitProjectFormSchema>;
export type CreateFormTemplateInput = z.infer<typeof createFormTemplateSchema>;
export type UpdateFormTemplateInput = z.infer<typeof updateFormTemplateSchema>;
export type FormFieldDef = z.infer<typeof formFieldSchema>;
export type FormFieldType = z.infer<typeof formFieldTypeSchema>;
