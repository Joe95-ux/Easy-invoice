import {
  calculateInvoiceTotals,
  lineItemAmount,
  resolveExchangeRate,
  toHomeCurrency,
  type InvoiceTotals,
} from "@/lib/calculator";
import type { AppliedTax } from "@/lib/schemas/tax-rates";
import { primaryTaxRate, resolveAppliedTaxes } from "@/lib/tax-rates";

export type TotalsLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  sortOrder: number;
  sectionTitle?: string | null;
  sectionSortOrder?: number;
  taxable?: boolean;
  timeEntryIds?: string[];
  expenseIds?: string[];
};

export type BuildDocumentTotalsInput = {
  lineItems: TotalsLineItem[];
  taxes?: AppliedTax[] | null;
  taxRate?: number | null;
  discount: number;
  taxInclusive?: boolean;
  currency: string;
  homeCurrency: string;
  exchangeRate?: number | null;
};

export type BuiltDocumentTotals = {
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    sortOrder: number;
    sectionTitle: string | null;
    sectionSortOrder: number;
    taxable: boolean;
  }>;
  totals: InvoiceTotals;
  taxes: AppliedTax[];
  taxRate: number;
  taxInclusive: boolean;
  exchangeRate: number;
  homeCurrencyTotal: number;
};

export function buildDocumentTotals(
  input: BuildDocumentTotalsInput,
): BuiltDocumentTotals {
  const taxes = resolveAppliedTaxes({
    taxes: input.taxes,
    taxRate: input.taxRate,
  });
  const taxInclusive = input.taxInclusive === true;

  const lineItems = input.lineItems.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: lineItemAmount(item.quantity, item.unitPrice),
    sortOrder: item.sortOrder,
    sectionTitle: item.sectionTitle?.trim() || null,
    sectionSortOrder: item.sectionSortOrder ?? 0,
    taxable: item.taxable !== false,
  }));

  const totals = calculateInvoiceTotals({
    lineItems: lineItems.map(({ quantity, unitPrice, taxable }) => ({
      quantity,
      unitPrice,
      taxable,
    })),
    taxes: taxes.map((tax) => ({ name: tax.name, rate: tax.rate })),
    taxRate: primaryTaxRate(taxes),
    discount: input.discount,
    taxInclusive,
  });

  const exchangeRate = resolveExchangeRate({
    documentCurrency: input.currency,
    homeCurrency: input.homeCurrency,
    exchangeRate: input.exchangeRate,
  });

  return {
    lineItems,
    totals,
    taxes,
    taxRate: primaryTaxRate(taxes),
    taxInclusive,
    exchangeRate,
    homeCurrencyTotal: toHomeCurrency(totals.total, exchangeRate),
  };
}

/** @deprecated Prefer buildDocumentTotals — kept for existing call sites. */
export function buildInvoiceTotals(input: {
  lineItems: TotalsLineItem[];
  taxRate: number;
  discount: number;
  taxes?: AppliedTax[] | null;
  taxInclusive?: boolean;
  currency?: string;
  homeCurrency?: string;
  exchangeRate?: number | null;
}) {
  const built = buildDocumentTotals({
    lineItems: input.lineItems,
    taxRate: input.taxRate,
    taxes: input.taxes,
    discount: input.discount,
    taxInclusive: input.taxInclusive,
    currency: input.currency ?? "USD",
    homeCurrency: input.homeCurrency ?? input.currency ?? "USD",
    exchangeRate: input.exchangeRate,
  });
  return { lineItems: built.lineItems, totals: built.totals, built };
}
