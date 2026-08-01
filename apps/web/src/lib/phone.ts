import {
  AsYouType,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

export function formatPhoneAsYouType(value: string, country: string): string {
  if (!value) return "";
  return new AsYouType(country as CountryCode).input(value);
}

export function validatePhone(value: string, country: string): boolean {
  if (!value.trim()) return true;
  try {
    return isValidPhoneNumber(value, country as CountryCode);
  } catch {
    return false;
  }
}

export function toE164Phone(value: string, country: string): string {
  if (!value.trim()) return "";
  const parsed = parsePhoneNumberFromString(value, country as CountryCode);
  return parsed?.number ?? value.trim();
}

export function splitPhoneNumber(
  e164: string,
  defaultCountry: string,
): { country: string; national: string } {
  if (!e164) return { country: defaultCountry, national: "" };

  const parsed = parsePhoneNumberFromString(e164);
  if (parsed) {
    return {
      country: parsed.country ?? defaultCountry,
      national: parsed.formatNational(),
    };
  }

  return { country: defaultCountry, national: e164 };
}

/** Pretty-print a stored phone (usually E.164) for invoices, estimates, and UI. */
export function formatPhoneForDisplay(
  value: string | null | undefined,
  options?: {
    defaultCountry?: string | null;
    /** International (+1 555 010 0100) is the default for documents. */
    style?: "international" | "national";
  },
): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";

  const defaultCountry = options?.defaultCountry?.trim() || undefined;
  const parsed = parsePhoneNumberFromString(
    raw,
    defaultCountry ? (defaultCountry as CountryCode) : undefined,
  );
  if (!parsed) return raw;

  return options?.style === "national"
    ? parsed.formatNational()
    : parsed.formatInternational();
}

/** Prefer E.164 for tel: links when the value can be parsed. */
export function toTelHref(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(raw);
  return parsed?.number ?? raw;
}

export function phoneValidationMessage(country: string): string {
  return `Enter a valid phone number for ${country}`;
}
