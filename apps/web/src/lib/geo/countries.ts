import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

const CURRENCY_BY_COUNTRY: Partial<Record<CountryCode, string>> = {
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  AU: "AUD",
  NZ: "NZD",
  IE: "EUR",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  JP: "JPY",
  CN: "CNY",
  IN: "INR",
  SG: "SGD",
  HK: "HKD",
  KR: "KRW",
  MX: "MXN",
  BR: "BRL",
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  ZA: "ZAR",
  AE: "AED",
  SA: "SAR",
  IL: "ILS",
  TR: "TRY",
  NG: "NGN",
  KE: "KES",
  GH: "GHS",
  EG: "EGP",
  PH: "PHP",
  TH: "THB",
  MY: "MYR",
  ID: "IDR",
  VN: "VND",
  PK: "PKR",
  BD: "BDT",
};

export type CountryOption = {
  code: CountryCode;
  name: string;
  dialCode: string;
  currency: string;
  flag: string;
};

export function countryFlag(code: string): string {
  const normalized = code.toUpperCase();
  if (normalized.length !== 2) return "";
  return [...normalized]
    .map((char) => String.fromCodePoint(0x1f1e6 - 65 + char.charCodeAt(0)))
    .join("");
}

function countryName(code: CountryCode): string {
  return displayNames.of(code) ?? code;
}

export const COUNTRIES: CountryOption[] = getCountries()
  .map((code) => ({
    code,
    name: countryName(code),
    dialCode: `+${getCountryCallingCode(code)}`,
    currency: CURRENCY_BY_COUNTRY[code] ?? "USD",
    flag: countryFlag(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function getCountry(code: string): CountryOption | undefined {
  return COUNTRIES.find((country) => country.code === code);
}

export function defaultCurrencyForCountry(code: string): string {
  return getCountry(code)?.currency ?? "USD";
}

export const CURRENCY_OPTIONS = [
  ...new Set([...COUNTRIES.map((c) => c.currency), "USD", "EUR", "GBP"]),
]
  .sort()
  .map((code) => ({ value: code, label: code }));
