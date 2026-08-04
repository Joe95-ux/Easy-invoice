import { z } from "zod";

export const followUpStatusSchema = z.enum(["OPEN", "DONE"]);
export const followUpSourceSchema = z.enum([
  "MANUAL",
  "INVOICE_OVERDUE",
  "INVOICE_DUE_SOON",
  "ESTIMATE_EXPIRING",
]);

const optionalId = z.string().min(1).optional().nullable();

const optionalDate = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string") {
    const key = value.trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : value;
  }
  return value;
}, z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional());

export const followUpSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    notes: z.string().max(2000).optional().nullable(),
    dueDate: optionalDate,
    clientId: optionalId,
    invoiceId: optionalId,
    estimateId: optionalId,
  })
  .superRefine((data, ctx) => {
    if (!data.clientId && !data.invoiceId && !data.estimateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Link a client, invoice, or estimate",
        path: ["invoiceId"],
      });
    }
  });

export const updateFollowUpSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).optional().nullable(),
  dueDate: optionalDate,
  status: followUpStatusSchema.optional(),
  clientId: optionalId,
  invoiceId: optionalId,
  estimateId: optionalId,
});

export const reorderFollowUpsSchema = z.object({
  orderedIds: z.array(z.string().min(1)),
});

export type FollowUpInput = z.infer<typeof followUpSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
