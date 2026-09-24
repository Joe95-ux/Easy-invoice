export type LineItemInput = {
  quantity: number;
  unitPrice: number;
  /** When false, line is excluded from the taxable base. Default true. */
  taxable?: boolean;
};

export type TaxLineInput = {
  name: string;
  rate: number;
};

export type InvoiceTotalsInput = {
  lineItems: LineItemInput[];
  /** Legacy single rate (0–1). Ignored when `taxes` is non-empty. */
  taxRate?: number;
  /** Additive tax lines applied to the taxable base after discount. */
  taxes?: TaxLineInput[];
  discount: number;
  taxInclusive?: boolean;
};

export type TaxBreakdownLine = {
  name: string;
  rate: number;
  amount: number;
};

export type InvoiceTotals = {
  subtotal: number;
  /** Subtotal of taxable lines only (before discount allocation). */
  taxableSubtotal: number;
  /** Taxable base after discount (exclusive mode) or gross inclusive base. */
  taxableAmount: number;
  taxAmount: number;
  taxBreakdown: TaxBreakdownLine[];
  /** Sum of applied rates (legacy-compatible effective rate). */
  effectiveTaxRate: number;
  total: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type DiscountMode = "amount" | "percent";

export function resolveDiscountAmount(
  subtotal: number,
  mode: DiscountMode,
  value: number,
): number {
  if (value <= 0 || subtotal <= 0) return 0;
  const amount =
    mode === "percent"
      ? roundMoney(subtotal * (Math.min(value, 100) / 100))
      : roundMoney(value);
  return Math.min(amount, subtotal);
}

export function calculateLineSubtotal(lineItems: LineItemInput[]): number {
  return roundMoney(
    lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );
}

function resolveTaxLines(input: InvoiceTotalsInput): TaxLineInput[] {
  if (input.taxes && input.taxes.length > 0) {
    return input.taxes.filter((tax) => tax.rate > 0 && tax.name.trim());
  }
  const rate = input.taxRate ?? 0;
  if (rate <= 0) return [];
  return [{ name: "Tax", rate }];
}

/**
 * Allocate document discount across taxable vs non-taxable lines
 * proportional to line totals so inclusive/exclusive math stays fair.
 */
function allocateDiscount(
  subtotal: number,
  taxableSubtotal: number,
  discount: number,
): { taxableAfterDiscount: number; nonTaxableAfterDiscount: number } {
  const cappedDiscount = Math.min(Math.max(discount, 0), subtotal);
  if (subtotal <= 0) {
    return { taxableAfterDiscount: 0, nonTaxableAfterDiscount: 0 };
  }
  const taxableShare = taxableSubtotal / subtotal;
  const taxableDiscount = roundMoney(cappedDiscount * taxableShare);
  const nonTaxableDiscount = roundMoney(cappedDiscount - taxableDiscount);
  const nonTaxableSubtotal = roundMoney(subtotal - taxableSubtotal);
  return {
    taxableAfterDiscount: Math.max(0, roundMoney(taxableSubtotal - taxableDiscount)),
    nonTaxableAfterDiscount: Math.max(
      0,
      roundMoney(nonTaxableSubtotal - nonTaxableDiscount),
    ),
  };
}

export function calculateInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const { lineItems, discount, taxInclusive = false } = input;
  const taxLines = resolveTaxLines(input);
  const effectiveTaxRate =
    Math.round(taxLines.reduce((sum, tax) => sum + tax.rate, 0) * 10000) / 10000;

  const subtotal = calculateLineSubtotal(lineItems);
  const taxableSubtotal = roundMoney(
    lineItems.reduce((sum, item) => {
      if (item.taxable === false) return sum;
      return sum + item.quantity * item.unitPrice;
    }, 0),
  );

  const { taxableAfterDiscount, nonTaxableAfterDiscount } = allocateDiscount(
    subtotal,
    taxableSubtotal,
    discount,
  );

  let taxAmount = 0;
  let taxBreakdown: TaxBreakdownLine[] = [];
  let total: number;
  let taxableAmount = taxableAfterDiscount;

  if (taxLines.length === 0) {
    total = roundMoney(taxableAfterDiscount + nonTaxableAfterDiscount);
    return {
      subtotal,
      taxableSubtotal,
      taxableAmount,
      taxAmount: 0,
      taxBreakdown: [],
      effectiveTaxRate: 0,
      total,
    };
  }

  if (taxInclusive) {
    // Prices already include tax. Extract tax from the taxable portion.
    const combinedRate = effectiveTaxRate;
    const grossTaxable = taxableAfterDiscount;
    const netTaxable =
      combinedRate > 0
        ? roundMoney(grossTaxable / (1 + combinedRate))
        : grossTaxable;
    taxAmount = roundMoney(grossTaxable - netTaxable);
    taxableAmount = grossTaxable;
    total = roundMoney(grossTaxable + nonTaxableAfterDiscount);

    // Apportion extracted tax across lines by rate share.
    taxBreakdown = taxLines.map((tax) => {
      const share = combinedRate > 0 ? tax.rate / combinedRate : 0;
      return {
        name: tax.name,
        rate: tax.rate,
        amount: roundMoney(taxAmount * share),
      };
    });
    // Fix rounding drift on last line.
    if (taxBreakdown.length > 0) {
      const assigned = taxBreakdown
        .slice(0, -1)
        .reduce((sum, line) => sum + line.amount, 0);
      taxBreakdown[taxBreakdown.length - 1]!.amount = roundMoney(
        taxAmount - assigned,
      );
    }
  } else {
    taxBreakdown = taxLines.map((tax) => ({
      name: tax.name,
      rate: tax.rate,
      amount: roundMoney(taxableAfterDiscount * tax.rate),
    }));
    taxAmount = roundMoney(
      taxBreakdown.reduce((sum, line) => sum + line.amount, 0),
    );
    total = roundMoney(
      taxableAfterDiscount + nonTaxableAfterDiscount + taxAmount,
    );
  }

  return {
    subtotal,
    taxableSubtotal,
    taxableAmount,
    taxAmount,
    taxBreakdown,
    effectiveTaxRate,
    total,
  };
}

export function lineItemAmount(quantity: number, unitPrice: number): number {
  return roundMoney(quantity * unitPrice);
}

/** Convert a document-currency amount into home currency. */
export function toHomeCurrency(
  amount: number,
  exchangeRate: number | null | undefined,
): number {
  const rate =
    exchangeRate == null || !Number.isFinite(exchangeRate) || exchangeRate <= 0
      ? 1
      : exchangeRate;
  return roundMoney(amount * rate);
}

export function resolveExchangeRate(input: {
  documentCurrency: string;
  homeCurrency: string;
  exchangeRate?: number | null;
}): number {
  const doc = input.documentCurrency.trim().toUpperCase();
  const home = input.homeCurrency.trim().toUpperCase();
  if (!doc || !home || doc === home) return 1;
  const rate = input.exchangeRate;
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return 1;
  return rate;
}
