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
  /** When true, an empty taxes array clears tax (no fallback to taxRate). */
  taxesProvided?: boolean;
  taxRate?: number | null;
  discount: number;
  taxInclusive?: boolean;
  taxCompound?: boolean;
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
  taxCompound: boolean;
  /** null when document currency ≠ home and FX is unknown. */
  exchangeRate: number | null;
  /** null when FX is unknown. */
  homeCurrencyTotal: number | null;
};

export function buildDocumentTotals(
  input: BuildDocumentTotalsInput,
): BuiltDocumentTotals {
  const taxes = resolveAppliedTaxes({
    taxes: input.taxes,
    taxRate: input.taxesProvided ? undefined : input.taxRate,
    taxesProvided: input.taxesProvided,
  });
  const taxInclusive = input.taxInclusive === true;
  const taxCompound = input.taxCompound === true;

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
    taxCompound,
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
    taxCompound,
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
  taxesProvided?: boolean;
  taxInclusive?: boolean;
  taxCompound?: boolean;
  currency?: string;
  homeCurrency?: string;
  exchangeRate?: number | null;
}) {
  const built = buildDocumentTotals({
    lineItems: input.lineItems,
    taxRate: input.taxRate,
    taxes: input.taxes,
    taxesProvided: input.taxesProvided,
    discount: input.discount,
    taxInclusive: input.taxInclusive,
    taxCompound: input.taxCompound,
    currency: input.currency ?? "USD",
    homeCurrency: input.homeCurrency ?? input.currency ?? "USD",
    exchangeRate: input.exchangeRate,
  });
  return { lineItems: built.lineItems, totals: built.totals, built };
}
