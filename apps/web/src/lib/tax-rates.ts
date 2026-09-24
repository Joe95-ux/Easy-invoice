import { newFormFieldId } from "@/lib/project-form-ids";
import {
  companyTaxRatesSchema,
  type AppliedTax,
  type CompanyTaxRate,
} from "@/lib/schemas/tax-rates";

export const MAX_COMPANY_TAX_RATES = 40;

export function normalizeCompanyTaxRates(raw: unknown): CompanyTaxRate[] {
  if (!Array.isArray(raw)) return [];

  const candidates = raw.slice(0, MAX_COMPANY_TAX_RATES).map((item, index) =>
    normalizeOneTaxRate(item, index),
  );
  const parsed = companyTaxRatesSchema.safeParse(candidates);
  if (parsed.success) {
    return ensureSingleDefault(parsed.data);
  }

  const fallback: CompanyTaxRate[] = [];
  for (const candidate of candidates) {
    const single = companyTaxRatesSchema.safeParse([candidate]);
    if (single.success) fallback.push(single.data[0]!);
  }
  return ensureSingleDefault(fallback);
}

function normalizeOneTaxRate(item: unknown, index: number): unknown {
  if (!item || typeof item !== "object") {
    return {
      id: newFormFieldId(),
      name: `Tax ${index + 1}`,
      rate: 0,
      region: null,
      isDefault: false,
      enabled: true,
    };
  }
  const row = item as Record<string, unknown>;
  let rate = typeof row.rate === "number" ? row.rate : Number(row.rate);
  if (!Number.isFinite(rate) || rate < 0) rate = 0;
  if (rate > 1) rate = Math.min(1, Math.round((rate / 100) * 10000) / 10000);
  rate = Math.round(rate * 10000) / 10000;

  const region =
    typeof row.region === "string" && row.region.trim()
      ? row.region.trim().slice(0, 40)
      : null;

  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id : newFormFieldId(),
    name:
      typeof row.name === "string" && row.name.trim()
        ? row.name.trim().slice(0, 80)
        : `Tax ${index + 1}`,
    rate,
    region,
    isDefault: row.isDefault === true,
    enabled: row.enabled !== false,
  };
}

function ensureSingleDefault(rates: CompanyTaxRate[]): CompanyTaxRate[] {
  const defaultIndex = rates.findIndex((rate) => rate.isDefault && rate.enabled);
  return rates.map((rate, index) => ({
    ...rate,
    isDefault: defaultIndex >= 0 ? index === defaultIndex : false,
  }));
}

export function getDefaultTaxRate(
  rates: CompanyTaxRate[],
): CompanyTaxRate | null {
  const enabled = rates.filter((rate) => rate.enabled);
  return enabled.find((rate) => rate.isDefault) ?? enabled[0] ?? null;
}

export function normalizeAppliedTaxes(raw: unknown): AppliedTax[] {
  if (!Array.isArray(raw)) return [];
  const out: AppliedTax[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name =
      typeof row.name === "string" && row.name.trim()
        ? row.name.trim().slice(0, 80)
        : "";
    let rate = typeof row.rate === "number" ? row.rate : Number(row.rate);
    if (!name || !Number.isFinite(rate) || rate < 0) continue;
    if (rate > 1) rate = Math.min(1, rate / 100);
    rate = Math.round(rate * 10000) / 10000;
    out.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id : null,
      name,
      rate,
    });
    if (out.length >= 8) break;
  }
  return out;
}

/** Prefer explicit taxes[]; fall back to legacy single taxRate. */
export function resolveAppliedTaxes(input: {
  taxes?: AppliedTax[] | null;
  taxRate?: number | null;
  taxName?: string | null;
}): AppliedTax[] {
  const fromList = normalizeAppliedTaxes(input.taxes);
  if (fromList.length > 0) return fromList;
  const rate = input.taxRate ?? 0;
  if (rate <= 0) return [];
  return [
    {
      id: null,
      name: input.taxName?.trim() || "Tax",
      rate,
    },
  ];
}

export function primaryTaxRate(taxes: AppliedTax[]): number {
  if (taxes.length === 0) return 0;
  if (taxes.length === 1) return taxes[0]!.rate;
  // Combined rate for legacy taxRate column (sum of additive rates).
  return Math.round(taxes.reduce((sum, tax) => sum + tax.rate, 0) * 10000) / 10000;
}

export function formatTaxPercent(rate: number): string {
  const pct = rate * 100;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(2).replace(/\.?0+$/, "");
}
