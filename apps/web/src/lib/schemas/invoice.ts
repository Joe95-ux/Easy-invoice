import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});

export const invoiceDraftSchema = z.object({
  client_name: z.string().min(1),
  client_email: z.string().email().optional().nullable(),
  client_phone: z.string().optional().nullable(),
  client_address: z.string().optional().nullable(),
  currency: z.string().length(3).default("USD"),
  issue_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tax_rate: z.number().min(0).max(1).default(0),
  discount: z.number().min(0).default(0),
  line_items: z.array(lineItemSchema).min(1),
  detected_language: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
});

export type InvoiceDraft = z.infer<typeof invoiceDraftSchema>;

const invoiceLineItemInputSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  sortOrder: z.number().int().nonnegative(),
});

export const createInvoiceSchema = z.object({
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
  dueDate: z.string().optional(),
  lineItems: z.array(invoiceLineItemInputSchema).min(1, "At least one line item is required"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  templateId: z.string().optional().nullable(),
  notes: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  clientEmail: z.string().email().optional(),
});

export const parseInvoiceRequestSchema = z.object({
  text: z.string().min(10),
  localeHint: z.string().optional(),
});

// Re-export company schemas for backwards compatibility
export {
  companyOnboardingSchema,
  companySettingsSchema,
  type CompanyOnboardingInput,
  type CompanySettingsInput,
} from "@/lib/schemas/company";
