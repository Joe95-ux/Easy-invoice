import { prisma } from "@/lib/db";
import type { ProductInput } from "@/lib/schemas/product";

export type SerializedProduct = {
  id: string;
  name: string;
  description: string | null;
  unitPrice: number;
  defaultQuantity: number;
  unit: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeProduct(product: {
  id: string;
  name: string;
  description: string | null;
  unitPrice: { toString(): string } | number;
  defaultQuantity: { toString(): string } | number;
  unit: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedProduct {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    unitPrice: Number(product.unitPrice),
    defaultQuantity: Number(product.defaultQuantity),
    unit: product.unit,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

/** Line-item description when adding a product to an invoice/estimate. */
export function productLineDescription(product: {
  name: string;
  description: string | null;
  unit?: string | null;
}): string {
  const detail = product.description?.trim() || product.name;
  const unit = product.unit?.trim();
  if (!unit) return detail;
  // Avoid duplicating unit if the description already mentions it.
  if (detail.toLowerCase().includes(unit.toLowerCase())) return detail;
  return `${detail} (${unit})`;
}

export async function getProductsForCompany(companyId: string) {
  return prisma.product.findMany({
    where: { companyId },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  });
}

export async function getProductForCompany(id: string, companyId: string) {
  return prisma.product.findFirst({
    where: { id, companyId },
  });
}

export async function createProduct(companyId: string, input: ProductInput) {
  return prisma.product.create({
    data: {
      companyId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      unitPrice: input.unitPrice,
      defaultQuantity: input.defaultQuantity,
      unit: input.unit?.trim() || null,
    },
  });
}

export async function updateProduct(companyId: string, id: string, input: ProductInput) {
  const existing = await getProductForCompany(id, companyId);
  if (!existing) return null;

  return prisma.product.update({
    where: { id },
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      unitPrice: input.unitPrice,
      defaultQuantity: input.defaultQuantity,
      unit: input.unit?.trim() || null,
    },
  });
}

export async function deleteProduct(companyId: string, id: string) {
  const existing = await getProductForCompany(id, companyId);
  if (!existing) return null;
  await prisma.product.delete({ where: { id } });
  return existing;
}
