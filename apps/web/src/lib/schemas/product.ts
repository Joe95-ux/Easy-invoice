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

export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  unitPrice: money,
  defaultQuantity: quantity,
  unit: z.string().max(40).optional().nullable(),
});

export type ProductInput = z.infer<typeof productSchema>;
