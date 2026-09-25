/**
 * Lightweight node:test suite for tax/currency calculator helpers.
 * Run: `npx tsx --test apps/web/src/lib/calculator.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateInvoiceTotals,
  resolveExchangeRate,
  toHomeCurrency,
} from "./calculator";

describe("calculateInvoiceTotals", () => {
  it("computes exclusive single tax", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [{ quantity: 2, unitPrice: 50 }],
      taxRate: 0.1,
      discount: 0,
    });
    assert.equal(totals.subtotal, 100);
    assert.equal(totals.taxAmount, 10);
    assert.equal(totals.total, 110);
    assert.deepEqual(totals.taxBreakdown, [
      { name: "Tax", rate: 0.1, amount: 10 },
    ]);
  });

  it("supports additive multi-tax", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [{ quantity: 1, unitPrice: 100 }],
      taxes: [
        { name: "GST", rate: 0.05 },
        { name: "PST", rate: 0.07 },
      ],
      discount: 0,
    });
    assert.equal(totals.taxAmount, 12);
    assert.equal(totals.total, 112);
    assert.equal(totals.effectiveTaxRate, 0.12);
    assert.equal(totals.taxBreakdown.length, 2);
  });

  it("supports compound multi-tax", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [{ quantity: 1, unitPrice: 100 }],
      taxes: [
        { name: "GST", rate: 0.05 },
        { name: "PST", rate: 0.07 },
      ],
      discount: 0,
      taxCompound: true,
    });
    // 5% of 100 = 5; 7% of 105 = 7.35 → tax 12.35, total 112.35
    assert.equal(totals.taxAmount, 12.35);
    assert.equal(totals.total, 112.35);
    assert.equal(totals.taxBreakdown[0]!.amount, 5);
    assert.equal(totals.taxBreakdown[1]!.amount, 7.35);
  });

  it("extracts tax when inclusive", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [{ quantity: 1, unitPrice: 110 }],
      taxRate: 0.1,
      discount: 0,
      taxInclusive: true,
    });
    assert.equal(totals.total, 110);
    assert.equal(totals.taxAmount, 10);
  });

  it("excludes non-taxable lines from tax base", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [
        { quantity: 1, unitPrice: 100, taxable: true },
        { quantity: 1, unitPrice: 50, taxable: false },
      ],
      taxRate: 0.1,
      discount: 0,
    });
    assert.equal(totals.subtotal, 150);
    assert.equal(totals.taxAmount, 10);
    assert.equal(totals.total, 160);
  });

  it("allocates discount across taxable share", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [
        { quantity: 1, unitPrice: 100, taxable: true },
        { quantity: 1, unitPrice: 100, taxable: false },
      ],
      taxRate: 0.1,
      discount: 20,
    });
    assert.equal(totals.taxAmount, 9);
    assert.equal(totals.total, 189);
  });
});

  describe("exchange rate helpers", () => {
  it("defaults to 1 for matching currencies", () => {
    assert.equal(
      resolveExchangeRate({
        documentCurrency: "usd",
        homeCurrency: "USD",
        exchangeRate: 1.5,
      }),
      1,
    );
  });

  it("returns null when foreign FX is missing", () => {
    assert.equal(
      resolveExchangeRate({
        documentCurrency: "EUR",
        homeCurrency: "USD",
        exchangeRate: null,
      }),
      null,
    );
  });

  it("converts to home currency", () => {
    assert.equal(toHomeCurrency(100, 1.25), 125);
    assert.equal(toHomeCurrency(100, null), null);
  });
});
