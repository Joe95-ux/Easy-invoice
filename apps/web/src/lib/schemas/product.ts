import { z } from "zod";

const money = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().min(0, "Price must be zero or more"));

const quantity = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return 1;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().positive("Quantity must be greater than zero"));

export function normalizeSku(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.slice(0, 40) : null;
}

export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  unitPrice: money,
  defaultQuantity: quantity,
  unit: z.string().max(40).optional().nullable(),
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

/** Map a document line into a new catalog product. */
export function productInputFromLineItem(item: {
  description: string;
  quantity: number;
  unitPrice: number;
  taxable?: boolean;
}): ProductInput {
  const text = item.description.trim();
  const [firstLine, ...rest] = text.split("\n");
  const name = (firstLine || "Untitled").slice(0, 200);
  const description = rest.join("\n").trim() || null;
  const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1;
  const unitPrice = Number.isFinite(item.unitPrice) && item.unitPrice >= 0 ? item.unitPrice : 0;

  return {
    name,
    description,
    unitPrice,
    defaultQuantity: quantity,
    unit: null,
    sku: null,
    taxable: item.taxable !== false,
  };
}
