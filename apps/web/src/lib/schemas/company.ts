import { z } from "zod";

export const logoBgSchema = z.enum(["white", "dark", "none"]);
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
export const documentPrefixSchema = z.preprocess(
  (value) => (value === null || value === undefined ? "" : value),
  z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || /^[A-Z0-9]{2,12}$/.test(value), {
      message: "Use 2–12 letters or numbers, or leave blank for the automatic prefix",
    })
    .transform((value) => (value === "" ? null : value)),
);

export const companySettingsSchema = companyProfileSchema.extend({
  taxId: z.string().optional(),
  logoBg: logoBgSchema.optional(),
  logoPlacement: logoPlacementSchema.optional(),
  brandColor: brandColorSchema,
  documentPrefix: documentPrefixSchema.nullable().optional(),
  defaultHourlyRate: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
    z.number().nonnegative().nullable().optional(),
  ),
  timerRoundToMinutes: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 1 : Number(value)),
    z.number().int().min(1).max(60).optional(),
  ),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
export type CompanyOnboardingInput = z.infer<typeof companyOnboardingSchema>;
export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
