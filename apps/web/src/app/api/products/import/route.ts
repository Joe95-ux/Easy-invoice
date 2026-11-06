import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireApiWriter,
  parseJsonBody,
  validationError,
} from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  MAX_PRODUCT_IMPORT_ROWS,
  parseProductsCsvText,
} from "@/features/products/lib/import-products-csv";
import { productFingerprint } from "@/lib/schemas/product";
import { serializeProduct } from "@/lib/products";

const importSchema = z.object({
  csv: z.string().min(1, "CSV content is required").max(2_000_000),
});

export async function POST(request: Request) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = parseProductsCsvText(parsed.data.csv, {
    maxRows: MAX_PRODUCT_IMPORT_ROWS,
  });

  if (result.rows.length === 0) {
    return NextResponse.json(
      {
        error: result.errors[0]?.message ?? "No valid product rows found",
        created: 0,
        skippedDuplicates: 0,
        skippedEmpty: result.skippedEmpty,
        errors: result.errors.slice(0, 20),
      },
      { status: 400 },
    );
  }

  const existing = await prisma.product.findMany({
    where: { companyId: member.companyId },
    select: {
      name: true,
      sku: true,
      unitPrice: true,
      unit: true,
      archivedAt: true,
    },
  });

  const existingSkus = new Set(
    existing
      .map((row) => row.sku?.trim().toLowerCase())
      .filter((sku): sku is string => Boolean(sku)),
  );
  const existingFingerprints = new Set(
    existing
      .filter((row) => !row.archivedAt)
      .map((row) =>
        productFingerprint({
          name: row.name,
          unitPrice: parseFloat(row.unitPrice.toString()),
          unit: row.unit,
        }),
      ),
  );

  const seenSkus = new Set<string>();
  const seenFingerprints = new Set<string>();
  const toCreate: typeof result.rows = [];
  let skippedDuplicates = 0;

  for (const row of result.rows) {
    if (row.skuKey && (existingSkus.has(row.skuKey) || seenSkus.has(row.skuKey))) {
      skippedDuplicates += 1;
      continue;
    }
    if (existingFingerprints.has(row.fingerprint) || seenFingerprints.has(row.fingerprint)) {
      skippedDuplicates += 1;
      continue;
    }
    if (row.skuKey) seenSkus.add(row.skuKey);
    seenFingerprints.add(row.fingerprint);
    toCreate.push(row);
  }

  const createdRows = [];
  const BATCH = 50;
  for (let i = 0; i < toCreate.length; i += BATCH) {
    const slice = toCreate.slice(i, i + BATCH);
    const batch = await prisma.$transaction(
      slice.map((row) =>
        prisma.product.create({
          data: {
            companyId: member.companyId,
            name: row.input.name.trim(),
            description: row.input.description?.trim() || null,
            unitPrice: row.input.unitPrice,
            defaultQuantity: row.input.defaultQuantity,
            unit: row.input.unit?.trim() || null,
            sku: row.input.sku ?? null,
            taxable: row.input.taxable ?? true,
          },
        }),
      ),
    );
    createdRows.push(...batch);
  }

  return NextResponse.json({
    created: createdRows.length,
    skippedDuplicates,
    skippedEmpty: result.skippedEmpty,
    errors: result.errors.slice(0, 20),
    errorCount: result.errors.length,
    products: createdRows.map(serializeProduct),
  });
}
