import { z } from "zod";

const estimateLineItemInputSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  sortOrder: z.number().int().nonnegative(),
});

export const createEstimateSchema = z.object({
  clientId: z.string().optional(),
  templateId: z.string().optional(),
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().length(3),
  taxRate: z.number().min(0).max(1),
  discount: z.number().min(0),
  issueDate: z.string().optional(),
  validUntil: z.string().optional(),
  lineItems: z.array(estimateLineItemInputSchema).min(1, "At least one line item is required"),
});

export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;

export const updateEstimateSchema = createEstimateSchema.partial().extend({
  status: z
    .enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"])
    .optional(),
  templateId: z.string().optional().nullable(),
  clientEmail: z.string().email().optional(),
});

export type UpdateEstimateInput = z.infer<typeof updateEstimateSchema>;
