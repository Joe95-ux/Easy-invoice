import { z } from "zod";

const money = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().min(0, "Price must be zero or more").max(9_999_999_999.99, "Price is too large"));

const quantity = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return 1;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().positive("Quantity must be greater than zero").max(99_999_999.9999, "Quantity is too large"));

export function normalizeSku(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.slice(0, 40) : null;
}

/** Same name + unit + price is a catalog twin. Different rates of the same name are allowed. */
export function productFingerprint(input: {
  name: string;
  unitPrice: number;
  unit?: string | null;
}): string {
  const name = input.name.trim().toLowerCase();
  const unit = (input.unit ?? "").trim().toLowerCase();
  const cents = Math.round((Number.isFinite(input.unitPrice) ? input.unitPrice : 0) * 100);
  return `${name}|${unit}|${cents}`;
}

export function parseTaxableCsv(value: string | null | undefined): boolean {
  const raw = value?.trim().toLowerCase() ?? "";
  if (!raw) return true;
  if (["no", "false", "0", "n", "untaxed", "not taxed"].includes(raw)) return false;
  return true;
}

export const productSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  unitPrice: money,
  defaultQuantity: quantity,
  unit: z.string().trim().max(40).optional().nullable(),
  sku: z.preprocess(
    (value) => (typeof value === "string" ? normalizeSku(value) : value ?? null),
    z.string().max(40).nullable().optional(),
  ),
  taxable: z.boolean().optional().default(true),
});

export const productArchiveSchema = z.object({
  archived: z.boolean(),
});

export type ProductInput = z.infer<typeof productSchema>;

const LINE_UNIT_SUFFIX = /\s+\(([^()\n]{1,40})\)$/;

/** Append `(unit)` unless the line already ends with that suffix. */
export function withLineUnitSuffix(detail: string, unit?: string | null): string {
  const trimmedUnit = unit?.trim();
  if (!trimmedUnit) return detail;
  if (detail.toLowerCase().endsWith(`(${trimmedUnit.toLowerCase()})`)) return detail;
  return `${detail} (${trimmedUnit})`;
}

/** Map a document line into a new catalog product. */
export function productInputFromLineItem(item: {
  description: string;
  quantity: number;
  unitPrice: number;
  taxable?: boolean;
}): ProductInput {
  let text = item.description.trim();
  let unit: string | null = null;
  const unitMatch = text.match(LINE_UNIT_SUFFIX);
  if (unitMatch?.index != null) {
    unit = unitMatch[1]!.trim() || null;
    text = text.slice(0, unitMatch.index).trim();
  }

  const [firstLine, ...rest] = text.split("\n");
  const name = (firstLine || "Untitled").slice(0, 200);
  const description = rest.join("\n").trim().slice(0, 2000) || null;
  const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
  const unitPrice = Number.isFinite(item.unitPrice) && item.unitPrice >= 0 ? item.unitPrice : 0;

  return {
    name,
    description,
    unitPrice,
    defaultQuantity: quantity,
    unit,
    sku: null,
    taxable: item.taxable !== false,
  };
}
