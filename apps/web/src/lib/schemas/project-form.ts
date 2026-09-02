import { z } from "zod";

export const formFieldTypeSchema = z.enum(["text", "email", "textarea", "url"]);

export const formFieldSchema = z.object({
  id: z.string().min(1),
  type: formFieldTypeSchema,
  label: z.string().min(1).max(120),
  required: z.boolean().default(false),
});

export const createProjectFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  templateId: z.string().min(1).optional().nullable(),
  fields: z.array(formFieldSchema).max(40).optional(),
});

export const submitProjectFormSchema = z.object({
  answers: z.record(z.string(), z.string()),
  submitterName: z.string().trim().max(200).optional().nullable(),
  submitterEmail: z.string().email().optional().or(z.literal("")).nullable(),
});

export type CreateProjectFormInput = z.infer<typeof createProjectFormSchema>;
export type SubmitProjectFormInput = z.infer<typeof submitProjectFormSchema>;
export type FormFieldDef = z.infer<typeof formFieldSchema>;
