import { z } from "zod";

export const FX_SOURCES = ["auto", "ecb", "open-er"] as const;
export type FxPreferredSource = (typeof FX_SOURCES)[number];

export const FX_RATE_SOURCES = ["ecb", "open-er", "manual"] as const;
export type FxRateSource = (typeof FX_RATE_SOURCES)[number];

export const companyFxSettingsSchema = z.object({
  fxPreferredSource: z.enum(FX_SOURCES).optional(),
  fxStaleDays: z.number().int().min(0).max(365).optional(),
  fxShowOnPdf: z.boolean().optional(),
  fxLockOnSend: z.boolean().optional(),
  fxAutoFetch: z.boolean().optional(),
});

export type CompanyFxSettingsInput = z.infer<typeof companyFxSettingsSchema>;

export const exchangeRateMetaSchema = z.object({
  exchangeRate: z.number().positive().nullable().optional(),
  exchangeRateDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .optional(),
  exchangeRateSource: z.enum(FX_RATE_SOURCES).nullable().optional(),
  exchangeRateLocked: z.boolean().optional(),
});

export type CompanyFxSettings = {
  fxPreferredSource: FxPreferredSource;
  fxStaleDays: number;
  fxShowOnPdf: boolean;
  fxLockOnSend: boolean;
  fxAutoFetch: boolean;
};

export const DEFAULT_COMPANY_FX_SETTINGS: CompanyFxSettings = {
  fxPreferredSource: "auto",
  fxStaleDays: 7,
  fxShowOnPdf: true,
  fxLockOnSend: true,
  fxAutoFetch: true,
};

export function normalizeCompanyFxSettings(
  input: Partial<CompanyFxSettings> | null | undefined,
): CompanyFxSettings {
  return {
    fxPreferredSource:
      input?.fxPreferredSource === "ecb" || input?.fxPreferredSource === "open-er"
        ? input.fxPreferredSource
        : "auto",
    fxStaleDays:
      typeof input?.fxStaleDays === "number" &&
      Number.isFinite(input.fxStaleDays) &&
      input.fxStaleDays >= 0
        ? Math.min(365, Math.floor(input.fxStaleDays))
        : DEFAULT_COMPANY_FX_SETTINGS.fxStaleDays,
    fxShowOnPdf: input?.fxShowOnPdf !== false,
    fxLockOnSend: input?.fxLockOnSend !== false,
    fxAutoFetch: input?.fxAutoFetch !== false,
  };
}

export function isExchangeRateStale(
  rateDate: string | Date | null | undefined,
  staleDays: number,
  asOf: Date = new Date(),
): boolean {
  if (staleDays <= 0 || rateDate == null) return false;
  const date =
    typeof rateDate === "string"
      ? new Date(`${rateDate}T00:00:00.000Z`)
      : rateDate;
  if (Number.isNaN(date.getTime())) return false;
  const ageMs = asOf.getTime() - date.getTime();
  return ageMs > staleDays * 24 * 60 * 60 * 1000;
}

export function formatFxSourceLabel(source: string | null | undefined): string | null {
  if (source === "ecb") return "ECB";
  if (source === "open-er") return "market";
  if (source === "manual") return "manual";
  return null;
}
