"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/forms/combobox";
import { COUNTRIES } from "@/lib/geo/countries";
import {
  formatPhoneAsYouType,
  phoneValidationMessage,
  toE164Phone,
  validatePhone,
} from "@/lib/phone";

type PhoneInputProps = {
  id?: string;
  label?: string;
  value: string;
  country: string;
  onChange: (e164: string) => void;
  error?: string;
  description?: string;
};

export function PhoneInput({
  id = "phone",
  label = "Phone",
  value,
  country,
  onChange,
  error,
  description,
}: PhoneInputProps) {
  const [dialCountry, setDialCountry] = useState(country || "US");
  const [national, setNational] = useState("");
  const [localError, setLocalError] = useState<string | undefined>();

  useEffect(() => {
    setDialCountry(country || "US");
  }, [country]);

  useEffect(() => {
    if (!value) {
      setNational("");
      return;
    }
    if (value.startsWith("+")) {
      const matched = COUNTRIES.find((item) => value.startsWith(item.dialCode));
      if (matched) {
        setDialCountry(matched.code);
        setNational(value.slice(matched.dialCode.length).trim());
        return;
      }
    }
    setNational(value);
  }, [value]);

  const dialOptions = useMemo(
    () =>
      COUNTRIES.map((item) => ({
        value: item.code,
        label: `${item.flag} ${item.dialCode}`,
        keywords: `${item.name} ${item.code} ${item.dialCode}`,
        render: (
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-base leading-none">{item.flag}</span>
            <span className="truncate">{item.name}</span>
            <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
              {item.dialCode}
            </span>
          </span>
        ),
      })),
    [],
  );

  function commitNumber(nextNational: string, nextCountry = dialCountry) {
    const formatted = formatPhoneAsYouType(nextNational, nextCountry);
    setNational(formatted);

    if (!formatted.trim()) {
      setLocalError(undefined);
      onChange("");
      return;
    }

    const valid = validatePhone(formatted, nextCountry);
    setLocalError(valid ? undefined : phoneValidationMessage(nextCountry));
    onChange(toE164Phone(formatted, nextCountry));
  }

  return (
    <Field data-invalid={!!(error || localError)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <div className="flex gap-2">
          <Combobox
            value={dialCountry}
            options={dialOptions}
            onChange={(next) => {
              setDialCountry(next);
              commitNumber(national, next);
            }}
            placeholder="Code"
            searchPlaceholder="Search country or code..."
            className="w-[108px] shrink-0 px-2.5"
            contentClassName="w-72 min-w-[18rem]"
            matchTriggerWidth={false}
            aria-label="Country code"
          />

          <Input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={national}
            onChange={(event) => commitNumber(event.target.value)}
            placeholder="Phone number"
            className="min-w-0 flex-1"
          />
        </div>
        {description && <FieldDescription>{description}</FieldDescription>}
        {(error || localError) && <FieldError>{error ?? localError}</FieldError>}
      </FieldContent>
    </Field>
  );
}
