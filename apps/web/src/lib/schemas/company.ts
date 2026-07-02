import { z } from "zod";

export const logoBgSchema = z.enum(["white", "dark"]);
export const logoPlacementSchema = z.enum(["watermark", "header"]);
export const brandColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use a valid hex color")
  .nullable()
  .optional();

export const companyProfileSchema = z.object({
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

export const companyOnboardingSchema = companyProfileSchema;
export const companySettingsSchema = companyProfileSchema.extend({
  taxId: z.string().optional(),
  logoBg: logoBgSchema.optional(),
  logoPlacement: logoPlacementSchema.optional(),
  brandColor: brandColorSchema,
  defaultHourlyRate: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
    z.number().nonnegative().nullable().optional(),
  ),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
export type CompanyOnboardingInput = z.infer<typeof companyOnboardingSchema>;
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
