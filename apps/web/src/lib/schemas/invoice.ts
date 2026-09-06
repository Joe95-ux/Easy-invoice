import { z } from "zod";
import { normalizeDraftDate } from "@/lib/draft-dates";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});

const draftSectionSchema = z.object({
  title: z.string().trim().max(120).default(""),
  items: z.array(lineItemSchema).min(1),
});

const draftDateSchema = z.preprocess(
  normalizeDraftDate,
  z.string().optional().nullable(),
);

/** AI often returns "" instead of null for missing contact fields. */
const optionalEmailSchema = z.preprocess((value) => {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}, z.string().email().nullable().optional());

const optionalTextSchema = z.preprocess((value) => {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}, z.string().nullable().optional());

const currencySchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim()) return value.trim().toUpperCase();
  return value;
}, z.string().length(3).default("USD"));

const taxRateSchema = z.preprocess((value) => {
  if (typeof value === "number" && value > 1) return Math.round((value / 100) * 10000) / 10000;
  return value;
}, z.number().min(0).max(1).default(0));

export const invoiceDraftSchema = z
  .object({
    client_name: z.string().min(1),
    client_email: optionalEmailSchema,
    client_phone: optionalTextSchema,
    client_address: optionalTextSchema,
    currency: currencySchema,
    issue_date: draftDateSchema,
    due_date: draftDateSchema,
    notes: optionalTextSchema,
    tax_rate: taxRateSchema,
    discount: z.number().min(0).default(0),
    /** Prefer sections when the job is partitioned (upstairs / downstairs, etc.). */
    sections: z.array(draftSectionSchema).optional(),
    line_items: z.array(lineItemSchema).optional(),
    detected_language: optionalTextSchema,
    confidence: z.number().min(0).max(1).optional().nullable(),
  })
  .transform((draft) => {
    const sections =
      draft.sections && draft.sections.length > 0
        ? draft.sections
        : draft.line_items && draft.line_items.length > 0
          ? [{ title: "", items: draft.line_items }]
          : [];
    const line_items = sections.flatMap((section) => section.items);
    return { ...draft, sections, line_items };
  })
  .pipe(
    z.object({
      client_name: z.string().min(1),
      client_email: z.string().email().nullable().optional(),
      client_phone: z.string().nullable().optional(),
      client_address: z.string().nullable().optional(),
      currency: z.string().length(3),
      issue_date: draftDateSchema,
      due_date: draftDateSchema,
      notes: z.string().nullable().optional(),
      tax_rate: z.number().min(0).max(1),
      discount: z.number().min(0),
      sections: z.array(draftSectionSchema).min(1),
      line_items: z.array(lineItemSchema).min(1),
      detected_language: z.string().nullable().optional(),
      confidence: z.number().min(0).max(1).optional().nullable(),
    }),
  );

export type InvoiceDraft = z.infer<typeof invoiceDraftSchema>;

const invoiceLineItemInputSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  sortOrder: z.number().int().nonnegative(),
  sectionTitle: z.string().trim().max(120).nullable().optional(),
  sectionSortOrder: z.number().int().nonnegative().optional(),
  timeEntryIds: z.array(z.string()).optional(),
  expenseIds: z.array(z.string()).optional(),
});

const invoiceInstallmentInputSchema = z.object({
  dueDate: z.string(),
  amount: z.number().positive(),
  label: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().optional(),
  projectId: z.string().min(1).optional().nullable(),
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
  installments: z.array(invoiceInstallmentInputSchema).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  status: z
    .enum(["DRAFT", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"])
    .optional(),
  templateId: z.string().optional().nullable(),
  clientEmail: z.string().email().optional(),
  dueDate: z.string().optional().nullable(),
  remindersPaused: z.boolean().optional(),
  installments: z.array(invoiceInstallmentInputSchema).optional(),
});

export const recordInvoicePaymentSchema = z.object({
  amount: z.number().positive(),
  paidAt: z.string().optional(),
  method: z.enum(["CASH", "CHECK", "BANK_TRANSFER", "CARD", "OTHER"]).optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export type RecordInvoicePaymentInput = z.infer<typeof recordInvoicePaymentSchema>;
export type InvoiceInstallmentInput = z.infer<typeof invoiceInstallmentInputSchema>;

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const parseInvoiceRequestSchema = z.object({
  text: z.string().min(10),
  localeHint: z.string().optional(),
  documentKind: z.enum(["invoice", "estimate"]).optional(),
  extractionMode: z.enum(["full", "lines_only"]).optional(),
  knownClientName: z.string().optional(),
});

export const documentExtractionModeSchema = z.enum(["full", "lines_only"]);
export type DocumentExtractionMode = z.infer<typeof documentExtractionModeSchema>;

export const documentParseMetaSchema = z.object({
  extraction_mode: documentExtractionModeSchema,
  extraction_method: z.enum(["text", "vision", "plain_text"]),
  warnings: z.array(z.string()),
  source_filename: z.string(),
});

export type DocumentParseMeta = z.infer<typeof documentParseMetaSchema>;

export type AiApplyMeta = {
  sourceNotes?: string;
} & Partial<DocumentParseMeta>;

export const parseDocumentResponseSchema = documentParseMetaSchema.and(invoiceDraftSchema);

export type ParseDocumentResponse = z.infer<typeof parseDocumentResponseSchema>;

// Re-export company schemas for backwards compatibility
export {
  companyOnboardingSchema,
  companySettingsSchema,
  type CompanyOnboardingInput,
  type CompanySettingsInput,
} from "@/lib/schemas/company";
