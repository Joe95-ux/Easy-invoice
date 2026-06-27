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
import { LOCALE_OPTIONS } from "@/lib/geo/locales";

type LocaleSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function LocaleSelect({
  id = "locale",
  value,
  onChange,
  error,
}: LocaleSelectProps) {
  const items = useMemo(
    () =>
      LOCALE_OPTIONS.map((locale) => ({
        value: locale.value,
        label: locale.label,
      })),
    [],
  );

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>Language &amp; region</FieldLabel>
      <FieldContent>
        <Select
          items={items}
          value={value}
          onValueChange={(next) => next && onChange(next)}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Select locale" />
          </SelectTrigger>
          <SelectContent className="max-h-72" alignItemWithTrigger={false}>
            {LOCALE_OPTIONS.map((locale) => (
              <SelectItem key={locale.value} value={locale.value}>
                <span className="flex w-full items-center justify-between gap-3">
                  <span>{locale.label}</span>
                  <span className="text-xs text-muted-foreground">{locale.native}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>Used for AI invoice parsing and formatting</FieldDescription>
        {error && <FieldError>{error}</FieldError>}
      </FieldContent>
    </Field>
  );
}
