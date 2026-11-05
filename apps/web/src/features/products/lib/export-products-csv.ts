import type { SerializedProduct } from "@/lib/products";

export const PRODUCT_CSV_HEADERS = [
  "Name",
  "SKU",
  "Description",
  "Unit price",
  "Default qty",
  "Unit",
  "Taxable",
] as const;

function escapeCsv(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function rowForProduct(product: SerializedProduct): Array<string | number> {
  return [
    product.name,
    product.sku ?? "",
    product.description ?? "",
    product.unitPrice,
    product.defaultQuantity,
    product.unit ?? "",
    product.taxable ? "Yes" : "No",
  ];
}

function csvFromRows(rows: Array<Array<string | number>>) {
  const body = [PRODUCT_CSV_HEADERS, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
  return "\uFEFF" + body;
}

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadProductsCsv(products: SerializedProduct[]) {
  const csv = csvFromRows(products.map(rowForProduct));
  triggerDownload(csv, `products-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function downloadProductsCsvTemplate() {
  triggerDownload(csvFromRows([]), "products-template.csv");
}
