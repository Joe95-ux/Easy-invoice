import type { FxRateSource } from "@/lib/schemas/fx-settings";

export function parseExchangeRateDate(
  value: string | Date | null | undefined,
): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatExchangeRateDate(
  value: Date | string | null | undefined,
): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
  }
  if (Number.isNaN(value.getTime())) return null;
  return value.toISOString().slice(0, 10);
}

export function exchangeRateMetaPersistFields(input: {
  exchangeRateDate?: string | null;
  exchangeRateSource?: FxRateSource | string | null;
  exchangeRateLocked?: boolean;
}): {
  exchangeRateDate?: Date | null;
  exchangeRateSource?: string | null;
  exchangeRateLocked?: boolean;
} {
  const fields: {
    exchangeRateDate?: Date | null;
    exchangeRateSource?: string | null;
    exchangeRateLocked?: boolean;
  } = {};
  if (input.exchangeRateDate !== undefined) {
    fields.exchangeRateDate = parseExchangeRateDate(input.exchangeRateDate);
  }
  if (input.exchangeRateSource !== undefined) {
    fields.exchangeRateSource = input.exchangeRateSource;
  }
  if (input.exchangeRateLocked !== undefined) {
    fields.exchangeRateLocked = input.exchangeRateLocked;
  }
  return fields;
}
