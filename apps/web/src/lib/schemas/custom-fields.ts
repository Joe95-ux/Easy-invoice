import { z } from "zod";

export const customFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
]);

export const customFieldAppliesToSchema = z.enum(["invoice", "estimate"]);

export const customFieldOptionSchema = z.object({
  value: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
});

export const customFieldDefinitionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().trim().min(1).max(120),
    type: customFieldTypeSchema,
    required: z.boolean().default(false),
    options: z.array(customFieldOptionSchema).max(50).optional(),
    appliesTo: z
      .array(customFieldAppliesToSchema)
      .min(1)
      .default(["invoice", "estimate"]),
    showOnPdf: z.boolean().default(true),
  })
  .superRefine((field, ctx) => {
    if (field.type === "select" && (!field.options || field.options.length < 1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one option",
        path: ["options"],
      });
    }
  });

export const customFieldDefinitionsSchema = z
  .array(customFieldDefinitionSchema)
  .max(40);

export const updateCustomFieldDefinitionsSchema = z.object({
  definitions: customFieldDefinitionsSchema,
});

/** Values keyed by definition id — always stored as strings. */
export const customFieldValuesSchema = z
  .record(z.string(), z.string().max(5000))
  .optional()
  .nullable();

export type CustomFieldType = z.infer<typeof customFieldTypeSchema>;
export type CustomFieldAppliesTo = z.infer<typeof customFieldAppliesToSchema>;
export type CustomFieldDefinition = z.infer<typeof customFieldDefinitionSchema>;
export type CustomFieldValues = Record<string, string>;
