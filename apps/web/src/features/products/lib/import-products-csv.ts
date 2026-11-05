import { parseCsv } from "@/lib/csv/parse";
import {
  normalizeSku,
  parseTaxableCsv,
  productFingerprint,
  productSchema,
  type ProductInput,
} from "@/lib/schemas/product";

export const MAX_PRODUCT_IMPORT_ROWS = 500;

type ProductImportFieldId =
  | "name"
  | "sku"
  | "description"
  | "unitPrice"
  | "defaultQuantity"
  | "unit"
  | "taxable";

const HEADER_ALIASES: Record<string, ProductImportFieldId> = {
  name: "name",
  product: "name",
  "product name": "name",
  item: "name",
  "item name": "name",
  service: "name",
  sku: "sku",
  code: "sku",
  "item code": "sku",
  description: "description",
  details: "description",
  "unit price": "unitPrice",
  price: "unitPrice",
  rate: "unitPrice",
  amount: "unitPrice",
  "default qty": "defaultQuantity",
  "default quantity": "defaultQuantity",
  qty: "defaultQuantity",
  quantity: "defaultQuantity",
  unit: "unit",
  units: "unit",
  taxable: "taxable",
  tax: "taxable",
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export type ParsedProductImportRow = {
  line: number;
  input: ProductInput;
  skuKey: string | null;
  fingerprint: string;
};

export type ProductImportParseResult = {
  rows: ParsedProductImportRow[];
  errors: Array<{ line: number; message: string }>;
  skippedEmpty: number;
};

export function parseProductsCsvText(
  text: string,
  options?: { maxRows?: number },
): ProductImportParseResult {
  const maxRows = options?.maxRows ?? MAX_PRODUCT_IMPORT_ROWS;
  const { headers, rows } = parseCsv(text);
  if (headers.length === 0) {
    return {
      rows: [],
      errors: [{ line: 1, message: "CSV is empty or missing a header row" }],
      skippedEmpty: 0,
    };
  }

  const columnMap = new Map<number, ProductImportFieldId>();
  const seen = new Set<ProductImportFieldId>();
  headers.forEach((header, index) => {
    const id = HEADER_ALIASES[normalizeHeader(header)];
    if (!id || seen.has(id)) return;
    seen.add(id);
    columnMap.set(index, id);
  });

  if (![...columnMap.values()].includes("name")) {
    return {
      rows: [],
      errors: [{ line: 1, message: 'CSV must include a "Name" column (or header "name")' }],
      skippedEmpty: 0,
    };
  }

  const parsedRows: ParsedProductImportRow[] = [];
  const errors: Array<{ line: number; message: string }> = [];
  let skippedEmpty = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const line = i + 2;
    if (parsedRows.length >= maxRows) {
      errors.push({
        line,
        message: `Row limit of ${maxRows} reached — remaining rows were not imported`,
      });
      break;
    }

    const cells = rows[i];
    const draft: Record<string, string> = {};
    for (const [colIndex, fieldId] of columnMap) {
      draft[fieldId] = (cells[colIndex] ?? "").trim();
    }

    const name = draft.name?.trim() ?? "";
    if (!name && Object.values(draft).every((value) => !value.trim())) {
      skippedEmpty += 1;
      continue;
    }

    const candidate = {
      name,
      description: draft.description || null,
      unitPrice: draft.unitPrice || 0,
      defaultQuantity: draft.defaultQuantity || 1,
      unit: draft.unit || null,
      sku: draft.sku || null,
      taxable: parseTaxableCsv(draft.taxable),
    };

    const validated = productSchema.safeParse(candidate);
    if (!validated.success) {
      errors.push({
        line,
        message: validated.error.issues[0]?.message ?? "Invalid row",
      });
      continue;
    }

    const skuKey = normalizeSku(validated.data.sku)?.toLowerCase() ?? null;
    parsedRows.push({
      line,
      input: validated.data,
      skuKey,
      fingerprint: productFingerprint(validated.data),
    });
  }

  return { rows: parsedRows, errors, skippedEmpty };
}
