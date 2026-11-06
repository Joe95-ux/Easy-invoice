/**
 * Run: `npx tsx --test src/features/products/lib/import-products-csv.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProductsCsvText } from "./import-products-csv";

describe("parseProductsCsvText", () => {
  it("maps export headers and taxable aliases", () => {
    const csv = [
      "Name,SKU,Description,Unit price,Default qty,Unit,Taxable",
      "Consulting,SVC-01,Strategy,150,1,hour,Yes",
      "Hosting fee,HOST,Monthly,12.5,1,month,no",
    ].join("\n");

    const parsed = parseProductsCsvText(csv);
    assert.equal(parsed.errors.length, 0);
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0]?.input.name, "Consulting");
    assert.equal(parsed.rows[0]?.input.sku, "SVC-01");
    assert.equal(parsed.rows[0]?.input.unitPrice, 150);
    assert.equal(parsed.rows[0]?.input.taxable, true);
    assert.equal(parsed.rows[1]?.input.taxable, false);
    assert.equal(parsed.rows[1]?.skuKey, "host");
  });

  it("requires a name column and skips empty rows", () => {
    const missing = parseProductsCsvText("Price,SKU\n10,ABC");
    assert.equal(missing.rows.length, 0);
    assert.match(missing.errors[0]?.message ?? "", /Name/);

    const withEmpty = parseProductsCsvText("Name,Unit price\nWidget,9\n,\nGadget,4");
    assert.equal(withEmpty.rows.length, 2);
    assert.equal(withEmpty.skippedEmpty, 1);
  });

  it("rejects a zero quantity instead of silently defaulting to 1", () => {
    const parsed = parseProductsCsvText("Name,Default qty,Unit price\nWidget,0,9");
    assert.equal(parsed.rows.length, 0);
    assert.match(parsed.errors[0]?.message ?? "", /Quantity/);
  });

  it("fingerprints twins so import can skip exact duplicates", () => {
    const csv = "Name,Unit price,Unit\nConsulting,150,hour\nconsulting,150.00,Hour";
    const parsed = parseProductsCsvText(csv);
    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0]?.fingerprint, parsed.rows[1]?.fingerprint);
  });
});
