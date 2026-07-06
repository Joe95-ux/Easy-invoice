"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinIcon } from "lucide-react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  addressLabelsForCountry,
  type AddressSuggestion,
  type AddressValues,
} from "@/lib/geo/address";
import { cn } from "@/lib/utils";

type AddressFieldsProps = {
  values: AddressValues;
  onChange: (patch: Partial<AddressValues>) => void;
  errors?: Partial<Record<keyof AddressValues, string>>;
  defaultCountry?: string;
};

export function AddressFields({
  values,
  onChange,
  errors = {},
  defaultCountry = "US",
}: AddressFieldsProps) {
  const country = values.country || defaultCountry;
  const labels = addressLabelsForCountry(country);
  const streetAddress = values.address ?? "";
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const userHasSearchedRef = useRef(false);

  useEffect(() => {
    if (!userHasSearchedRef.current) {
      return;
    }

    if (streetAddress.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: streetAddress });
        if (country) params.set("country", country);
        const response = await fetch(`/api/address/search?${params.toString()}`);
        if (!response.ok) return;
        const results = (await response.json()) as AddressSuggestion[];
        setSuggestions(results);
        setOpen(results.length > 0);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [streetAddress, country]);

  function applySuggestion(suggestion: AddressSuggestion) {
    userHasSearchedRef.current = false;
    onChange({
      address: suggestion.address || suggestion.label.split(",")[0] || "",
      city: suggestion.city,
      state: suggestion.state,
      zip: suggestion.zip,
      country: suggestion.country || country,
    });
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="address-search">Street address</FieldLabel>
        <FieldContent>
          <div className="relative">
            <MapPinIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="address-search"
              value={streetAddress}
              onChange={(event) => {
                userHasSearchedRef.current = true;
                onChange({ address: event.target.value });
              }}
              onFocus={() => {
                if (suggestions.length > 0) setOpen(true);
              }}
              onBlur={() => window.setTimeout(() => setOpen(false), 150)}
              placeholder="Street address"
              className="pl-9"
              autoComplete="street-address"
            />
            {open && suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-md">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applySuggestion(suggestion)}
                  >
                    <span className="line-clamp-2">{suggestion.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <FieldDescription>
            {searching ? "Looking up addresses..." : "Optional. Pick a suggestion or type manually."}
          </FieldDescription>
        </FieldContent>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="city">City</FieldLabel>
          <FieldContent>
            <Input
              id="city"
              value={values.city ?? ""}
              onChange={(event) => onChange({ city: event.target.value })}
              autoComplete="address-level2"
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="state">{labels.state}</FieldLabel>
          <FieldContent>
            <Input
              id="state"
              value={values.state ?? ""}
              onChange={(event) => onChange({ state: event.target.value })}
              autoComplete="address-level1"
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="zip">{labels.zip}</FieldLabel>
          <FieldContent>
            <Input
              id="zip"
              value={values.zip ?? ""}
              onChange={(event) => onChange({ zip: event.target.value })}
              autoComplete="postal-code"
            />
            {errors.zip && (
              <p className="text-xs text-destructive">{errors.zip}</p>
            )}
          </FieldContent>
        </Field>
      </div>
    </div>
  );
}
