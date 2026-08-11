import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required").max(2000),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitPrice: z.number().nonnegative("Unit price must be zero or more"),
  sortOrder: z.number().int().nonnegative().default(0),
  sectionTitle: z.string().trim().max(120).nullable().optional(),
  sectionSortOrder: z.number().int().nonnegative().optional(),
});

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const recurringFrequencySchema = z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]);
export const recurringInvoiceStatusSchema = z.enum(["ACTIVE", "PAUSED", "ENDED"]);

const recurringInvoiceFieldsSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  clientId: z.string().min(1, "Client is required"),
  frequency: recurringFrequencySchema,
  interval: z.number().int().min(1).max(52).default(1),
  startDate: dateOnlySchema,
  /** Defaults to startDate when omitted. */
  nextIssueDate: dateOnlySchema.optional(),
  endDate: dateOnlySchema.optional().nullable(),
  maxOccurrences: z.number().int().min(1).max(10_000).optional().nullable(),
  dueDaysAfterIssue: z.number().int().min(0).max(365).default(14),
  autoSend: z.boolean().default(false),
  currency: z.string().length(3).default("USD"),
  taxRate: z.number().min(0).max(1).default(0),
  discount: z.number().min(0).default(0),
  notes: z.string().max(5000).optional().nullable(),
  templateId: z.string().optional().nullable(),
  sourceInvoiceId: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

function refineEndDate(
  data: { startDate: string; nextIssueDate?: string; endDate?: string | null },
  ctx: z.RefinementCtx,
) {
  const next = data.nextIssueDate ?? data.startDate;
  if (data.endDate && data.endDate < next) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be on or after the next issue date",
      path: ["endDate"],
    });
  }
}

export const createRecurringInvoiceSchema =
  recurringInvoiceFieldsSchema.superRefine(refineEndDate);

export const updateRecurringInvoiceSchema = recurringInvoiceFieldsSchema
  .omit({ sourceInvoiceId: true })
  .partial()
  .extend({
    status: recurringInvoiceStatusSchema.optional(),
    lineItems: z.array(lineItemSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < (data.nextIssueDate ?? data.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after the next issue date",
        path: ["endDate"],
      });
    }
  });

export const createRecurringFromInvoiceSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    frequency: recurringFrequencySchema.default("MONTHLY"),
    interval: z.number().int().min(1).max(52).default(1),
    startDate: dateOnlySchema,
    nextIssueDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional().nullable(),
    maxOccurrences: z.number().int().min(1).max(10_000).optional().nullable(),
    dueDaysAfterIssue: z.number().int().min(0).max(365).optional(),
    autoSend: z.boolean().default(false),
  })
  .superRefine(refineEndDate);

export type CreateRecurringInvoiceInput = z.infer<typeof createRecurringInvoiceSchema>;
export type UpdateRecurringInvoiceInput = z.infer<typeof updateRecurringInvoiceSchema>;
export type CreateRecurringFromInvoiceInput = z.infer<typeof createRecurringFromInvoiceSchema>;
