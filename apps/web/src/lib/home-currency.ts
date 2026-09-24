import { toHomeCurrency } from "@/lib/calculator";

type MoneyLike = { toString(): string } | number | null | undefined;

function toNumber(value: MoneyLike): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : parseFloat(value.toString());
}

/**
 * Prefer homeCurrencyTotal for company reporting; otherwise use total when
 * currencies match; otherwise convert with exchangeRate when present.
 */
export function invoiceAmountInHomeCurrency(input: {
  total: MoneyLike;
  currency: string;
  homeCurrency: string;
  homeCurrencyTotal?: MoneyLike;
  exchangeRate?: MoneyLike;
}): number | null {
  const homeTotal = input.homeCurrencyTotal;
  if (homeTotal != null) {
    const n = toNumber(homeTotal);
    if (Number.isFinite(n)) return n;
  }

  const doc = input.currency.trim().toUpperCase();
  const home = input.homeCurrency.trim().toUpperCase();
  const total = toNumber(input.total);
  if (!Number.isFinite(total)) return null;

  if (!doc || !home || doc === home) return total;

  const rate = input.exchangeRate == null ? null : toNumber(input.exchangeRate);
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  return toHomeCurrency(total, rate);
}

/** Convert a payment in invoice currency to home currency when possible. */
export function paymentAmountInHomeCurrency(input: {
  amount: MoneyLike;
  invoiceCurrency: string;
  homeCurrency: string;
  exchangeRate?: MoneyLike;
}): number | null {
  const amount = toNumber(input.amount);
  if (!Number.isFinite(amount)) return null;

  const doc = input.invoiceCurrency.trim().toUpperCase();
  const home = input.homeCurrency.trim().toUpperCase();
  if (!doc || !home || doc === home) return amount;

  const rate = input.exchangeRate == null ? null : toNumber(input.exchangeRate);
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  return toHomeCurrency(amount, rate);
}
