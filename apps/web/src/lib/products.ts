import { prisma } from "@/lib/db";
import { normalizeSku, type ProductInput } from "@/lib/schemas/product";

export type SerializedProduct = {
  id: string;
  name: string;
  description: string | null;
  unitPrice: number;
  defaultQuantity: number;
  unit: string | null;
  sku: string | null;
  taxable: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export class ProductSkuTakenError extends Error {
  constructor() {
    super("That SKU is already in use");
    this.name = "ProductSkuTakenError";
  }
}

export class ProductNotArchivedError extends Error {
  constructor() {
    super("Archive this product before deleting it");
    this.name = "ProductNotArchivedError";
  }
}

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  unitPrice: { toString(): string } | number;
  defaultQuantity: { toString(): string } | number;
  unit: string | null;
  sku: string | null;
  taxable: boolean;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeProduct(product: ProductRow): SerializedProduct {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    unitPrice: Number(product.unitPrice),
    defaultQuantity: Number(product.defaultQuantity),
    unit: product.unit,
    sku: product.sku,
    taxable: product.taxable,
    archivedAt: product.archivedAt?.toISOString() ?? null,
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

export type ProductArchiveFilter = "active" | "archived" | "all";

export async function getProductsForCompany(
  companyId: string,
  archived: ProductArchiveFilter = "all",
) {
  return prisma.product.findMany({
    where: {
      companyId,
      ...(archived === "active" ? { archivedAt: null } : {}),
      ...(archived === "archived" ? { archivedAt: { not: null } } : {}),
    },
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
  });
}

export async function getProductForCompany(id: string, companyId: string) {
  return prisma.product.findFirst({
    where: { id, companyId },
  });
}

async function assertSkuAvailable(companyId: string, sku: string | null, excludeId?: string) {
  const normalized = normalizeSku(sku);
  if (!normalized) return;

  const existing = await prisma.product.findFirst({
    where: {
      companyId,
      sku: { equals: normalized, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) throw new ProductSkuTakenError();
}

export async function createProduct(companyId: string, input: ProductInput) {
  const sku = normalizeSku(input.sku);
  await assertSkuAvailable(companyId, sku);

  return prisma.product.create({
    data: {
      companyId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      unitPrice: input.unitPrice,
      defaultQuantity: input.defaultQuantity,
      unit: input.unit?.trim() || null,
      sku,
      taxable: input.taxable ?? true,
    },
  });
}

export async function updateProduct(companyId: string, id: string, input: ProductInput) {
  const existing = await getProductForCompany(id, companyId);
  if (!existing) return null;

  const sku = normalizeSku(input.sku);
  await assertSkuAvailable(companyId, sku, id);

  return prisma.product.update({
    where: { id },
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      unitPrice: input.unitPrice,
      defaultQuantity: input.defaultQuantity,
      unit: input.unit?.trim() || null,
      sku,
      taxable: input.taxable ?? true,
    },
  });
}

export async function setProductArchived(companyId: string, id: string, archived: boolean) {
  const existing = await getProductForCompany(id, companyId);
  if (!existing) return null;

  return prisma.product.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });
}

export async function deleteProduct(companyId: string, id: string) {
  const existing = await getProductForCompany(id, companyId);
  if (!existing) return null;
  if (!existing.archivedAt) {
    throw new ProductNotArchivedError();
  }
  await prisma.product.delete({ where: { id } });
  return existing;
}
