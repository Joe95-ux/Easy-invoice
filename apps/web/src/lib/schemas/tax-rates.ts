import { z } from "zod";

export const companyTaxRateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  /** Fraction 0–1 (e.g. 0.2 = 20%). */
  rate: z.number().min(0).max(1),
  /** Optional region/code label shown in the library (e.g. "CA", "VAT"). */
  region: z.string().trim().max(40).nullable().optional(),
  isDefault: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

export const companyTaxRatesSchema = z.array(companyTaxRateSchema).max(40);

export const updateCompanyTaxRatesSchema = z.object({
  taxRates: companyTaxRatesSchema,
  taxInclusiveDefault: z.boolean().optional(),
  taxCompoundDefault: z.boolean().optional(),
});

/** A tax applied on a document (snapshot of name + rate at save time). */
export const appliedTaxSchema = z.object({
  id: z.string().min(1).optional().nullable(),
  name: z.string().trim().min(1).max(80),
  rate: z.number().min(0).max(1),
});

export const appliedTaxesSchema = z.array(appliedTaxSchema).max(8);

export type CompanyTaxRate = z.infer<typeof companyTaxRateSchema>;
export type AppliedTax = z.infer<typeof appliedTaxSchema>;
