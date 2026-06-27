"use client";

import { useMemo } from "react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_OPTIONS } from "@/lib/geo/countries";

type CurrencySelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function CurrencySelect({
  id = "currency",
  value,
  onChange,
  error,
}: CurrencySelectProps) {
  const items = useMemo(
    () => CURRENCY_OPTIONS.map((currency) => ({ value: currency.value, label: currency.label })),
    [],
  );

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>Currency</FieldLabel>
      <FieldContent>
        <Select
          items={items}
          value={value}
          onValueChange={(next) => next && onChange(next)}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent className="max-h-72" alignItemWithTrigger={false}>
            {CURRENCY_OPTIONS.map((currency) => (
              <SelectItem key={currency.value} value={currency.value}>
                {currency.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>Default currency for new invoices</FieldDescription>
        {error && <FieldError>{error}</FieldError>}
      </FieldContent>
    </Field>
  );
}
