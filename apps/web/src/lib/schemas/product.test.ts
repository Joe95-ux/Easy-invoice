/**
 * Run: `npx tsx --test src/lib/schemas/product.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeSku,
  parseTaxableCsv,
  productFingerprint,
  productInputFromLineItem,
  productSchema,
  withLineUnitSuffix,
} from "./product";

describe("normalizeSku", () => {
  it("trims and drops empty values", () => {
    assert.equal(normalizeSku("  SVC-01  "), "SVC-01");
    assert.equal(normalizeSku("   "), null);
    assert.equal(normalizeSku(null), null);
  });
});

describe("productInputFromLineItem", () => {
  it("uses the first line as the name and the rest as description", () => {
    const input = productInputFromLineItem({
      description: "Website design\nHomepage + contact",
      quantity: 2,
      unitPrice: 1200,
      taxable: false,
    });
    assert.equal(input.name, "Website design");
    assert.equal(input.description, "Homepage + contact");
    assert.equal(input.defaultQuantity, 2);
    assert.equal(input.unitPrice, 1200);
    assert.equal(input.taxable, false);
    assert.equal(input.sku, null);
  });

  it("recovers a trailing unit suffix from library line text", () => {
    const input = productInputFromLineItem({
      description: "Consulting (hour)",
      quantity: 1,
      unitPrice: 150,
    });
    assert.equal(input.name, "Consulting");
    assert.equal(input.unit, "hour");
  });

  it("defaults untitled and taxable when the line is sparse", () => {
    const input = productInputFromLineItem({
      description: "  ",
      quantity: 0,
      unitPrice: -4,
    });
    assert.equal(input.name, "Untitled");
    assert.equal(input.defaultQuantity, 1);
    assert.equal(input.unitPrice, 0);
    assert.equal(input.taxable, true);
  });
});

describe("productFingerprint", () => {
  it("treats same name, unit, and price as twins, ignoring case and money float", () => {
    assert.equal(
      productFingerprint({ name: "Consulting", unitPrice: 150, unit: "Hour" }),
      productFingerprint({ name: "consulting", unitPrice: 150.001, unit: "hour" }),
    );
  });

  it("keeps the same name at a different rate distinct", () => {
    assert.notEqual(
      productFingerprint({ name: "Consulting", unitPrice: 150, unit: "hour" }),
      productFingerprint({ name: "Consulting", unitPrice: 200, unit: "hour" }),
    );
  });
});

describe("parseTaxableCsv", () => {
  it("defaults empty to taxed and maps common no values", () => {
    assert.equal(parseTaxableCsv(""), true);
    assert.equal(parseTaxableCsv("yes"), true);
    assert.equal(parseTaxableCsv("No"), false);
    assert.equal(parseTaxableCsv("0"), false);
  });
});

describe("withLineUnitSuffix", () => {
  it("does not treat a unit as present just because it appears inside a word", () => {
    assert.equal(withLineUnitSuffix("Beach cleanup", "each"), "Beach cleanup (each)");
    assert.equal(withLineUnitSuffix("Consulting (hour)", "hour"), "Consulting (hour)");
  });
});

describe("productSchema", () => {
  it("normalizes blank SKU to null and defaults taxable", () => {
    const parsed = productSchema.parse({
      name: "Retainer",
      unitPrice: 500,
      defaultQuantity: 1,
      sku: "  ",
    });
    assert.equal(parsed.sku, null);
    assert.equal(parsed.taxable, true);
  });

  it("trims the name and rejects whitespace-only names", () => {
    const parsed = productSchema.parse({
      name: "  Retainer  ",
      unitPrice: 500,
      defaultQuantity: 1,
    });
    assert.equal(parsed.name, "Retainer");
    assert.equal(
      productSchema.safeParse({
        name: "   ",
        unitPrice: 500,
        defaultQuantity: 1,
      }).success,
      false,
    );
  });
});
