import { describe, expect, it } from "vitest";
import {
  calculateInvoiceTotals,
  resolveExchangeRate,
  toHomeCurrency,
} from "@/lib/calculator";
import {
  getDefaultTaxRate,
  normalizeCompanyTaxRates,
  primaryTaxRate,
  resolveAppliedTaxes,
} from "@/lib/tax-rates";

describe("calculateInvoiceTotals", () => {
  it("computes exclusive single tax", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [{ quantity: 2, unitPrice: 50 }],
      taxRate: 0.1,
      discount: 0,
    });
    expect(totals.subtotal).toBe(100);
    expect(totals.taxAmount).toBe(10);
    expect(totals.total).toBe(110);
    expect(totals.taxBreakdown).toEqual([
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
    expect(totals.taxAmount).toBe(12);
    expect(totals.total).toBe(112);
    expect(totals.effectiveTaxRate).toBe(0.12);
    expect(totals.taxBreakdown).toHaveLength(2);
  });

  it("extracts tax when inclusive", () => {
    const totals = calculateInvoiceTotals({
      lineItems: [{ quantity: 1, unitPrice: 110 }],
      taxRate: 0.1,
      discount: 0,
      taxInclusive: true,
    });
    expect(totals.total).toBe(110);
    expect(totals.taxAmount).toBe(10);
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
    expect(totals.subtotal).toBe(150);
    expect(totals.taxAmount).toBe(10);
    expect(totals.total).toBe(160);
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
    // Taxable after discount: 90 → tax 9; non-taxable after discount: 90
    expect(totals.taxAmount).toBe(9);
    expect(totals.total).toBe(189);
  });
});

describe("exchange rate helpers", () => {
  it("defaults to 1 for matching currencies", () => {
    expect(
      resolveExchangeRate({
        documentCurrency: "usd",
        homeCurrency: "USD",
        exchangeRate: 1.5,
      }),
    ).toBe(1);
  });

  it("converts to home currency", () => {
    expect(toHomeCurrency(100, 1.25)).toBe(125);
    expect(toHomeCurrency(100, null)).toBe(100);
  });
});

describe("tax rates library", () => {
  it("normalizes rates and enforces a single default", () => {
    const rates = normalizeCompanyTaxRates([
      { id: "a", name: "VAT", rate: 20, isDefault: true },
      { id: "b", name: "GST", rate: 0.05, isDefault: true },
    ]);
    expect(rates).toHaveLength(2);
    expect(rates[0]!.rate).toBe(0.2);
    expect(rates.filter((r) => r.isDefault)).toHaveLength(1);
    expect(getDefaultTaxRate(rates)?.id).toBe("a");
  });

  it("resolves applied taxes from legacy taxRate", () => {
    const taxes = resolveAppliedTaxes({ taxRate: 0.08 });
    expect(primaryTaxRate(taxes)).toBe(0.08);
    expect(taxes[0]!.name).toBe("Tax");
  });
});
