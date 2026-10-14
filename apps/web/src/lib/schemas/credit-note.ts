import { z } from "zod";

export const creditNoteLineItemInputSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  sortOrder: z.number().int().nonnegative(),
  sectionTitle: z.string().trim().max(120).nullable().optional(),
  sectionSortOrder: z.number().int().nonnegative().optional(),
  taxable: z.boolean().optional().default(true),
});

export const createCreditNoteSchema = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  issueDate: z.string().optional(),
  templateId: z.string().optional().nullable(),
  lineItems: z.array(creditNoteLineItemInputSchema).min(1, "At least one line item is required"),
  issue: z.boolean().optional(),
});

export const updateCreditNoteSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  issueDate: z.string().optional(),
  templateId: z.string().optional().nullable(),
  lineItems: z.array(creditNoteLineItemInputSchema).min(1).optional(),
});

export const issueCreditNoteSchema = z.object({
  issueDate: z.string().optional(),
});

export const sendCreditNoteSchema = z.object({
  email: z.string().email().optional(),
  message: z.string().trim().max(2000).optional(),
  subject: z.string().trim().max(200).optional(),
});

export const voidInvoiceSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
});

export const recordInvoiceRefundSchema = z.object({
  amount: z.number().positive(),
  paidAt: z.string().optional(),
  method: z.enum(["CASH", "CHECK", "BANK_TRANSFER", "CARD", "OTHER"]).optional(),
  reference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
  creditNoteId: z.string().optional().nullable(),
  processStripe: z.boolean().optional(),
});

export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>;
export type UpdateCreditNoteInput = z.infer<typeof updateCreditNoteSchema>;
export type RecordInvoiceRefundInput = z.infer<typeof recordInvoiceRefundSchema>;
