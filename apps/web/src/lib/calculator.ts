export type LineItemInput = {
  quantity: number;
  unitPrice: number;
};

export type InvoiceTotalsInput = {
  lineItems: LineItemInput[];
  taxRate: number;
  discount: number;
  taxInclusive?: boolean;
};

export type InvoiceTotals = {
  subtotal: number;
  taxAmount: number;
  total: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const { lineItems, taxRate, discount, taxInclusive = false } = input;

  const subtotal = roundMoney(
    lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );

  let taxAmount: number;
  let total: number;

  if (taxInclusive) {
    total = roundMoney(Math.max(subtotal - discount, 0));
    taxAmount = roundMoney(total - total / (1 + taxRate));
  } else {
    const taxable = Math.max(subtotal - discount, 0);
    taxAmount = roundMoney(taxable * taxRate);
    total = roundMoney(taxable + taxAmount);
  }

  return { subtotal, taxAmount, total };
}

export function lineItemAmount(quantity: number, unitPrice: number): number {
  return roundMoney(quantity * unitPrice);
}
