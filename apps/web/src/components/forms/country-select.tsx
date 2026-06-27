"use client";

import { useMemo } from "react";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { COUNTRIES, defaultCurrencyForCountry } from "@/lib/geo/countries";

type CountrySelectProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (code: string) => void;
  onCountryChange?: (country: (typeof COUNTRIES)[number]) => void;
  error?: string;
  description?: string;
};

export function CountrySelect({
  id = "country",
  label = "Country",
  value,
  onChange,
  onCountryChange,
  error,
  description,
}: CountrySelectProps) {
  const options = useMemo(
    () =>
      COUNTRIES.map((country) => ({
        value: country.code,
        label: `${country.flag} ${country.name}`,
        keywords: `${country.code} ${country.dialCode}`,
        render: (
          <span className="flex items-center gap-2">
            <span>{country.flag}</span>
            <span>{country.name}</span>
            <span className="text-xs text-muted-foreground">{country.code}</span>
          </span>
        ),
      })),
    [],
  );

  function handleChange(code: string) {
    onChange(code);
    const country = COUNTRIES.find((item) => item.code === code);
    if (country) onCountryChange?.(country);
  }

  return (
    <SearchableSelect
      id={id}
      label={label}
      value={value}
      onChange={handleChange}
      options={options}
      error={error}
      description={description}
      placeholder="Select country"
      contentClassName="w-72 min-w-[18rem]"
      matchTriggerWidth={false}
    />
  );
}

export { defaultCurrencyForCountry };
