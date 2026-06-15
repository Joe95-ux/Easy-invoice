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

export const companyOnboardingSchema = z.object({
  name: z.string().min(2, "Company name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().min(2).default("US"),
  currency: z.string().length(3).default("USD"),
  locale: z.string().default("en"),
});

export type CompanyOnboardingInput = z.infer<typeof companyOnboardingSchema>;
