"use client";

import { AddressFields } from "@/components/forms/address-fields";
import { CountrySelect, defaultCurrencyForCountry } from "@/components/forms/country-select";
import { CurrencySelect } from "@/components/forms/currency-select";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { LocaleSelect } from "@/components/forms/locale-select";
import { PhoneInput } from "@/components/forms/phone-input";
import type { CompanyProfileInput } from "@/lib/schemas/company";

type CompanyProfileFieldsProps = {
  values: CompanyProfileInput;
  errors?: Record<string, string>;
  onChange: <K extends keyof CompanyProfileInput>(key: K, value: CompanyProfileInput[K]) => void;
  showTaxId?: boolean;
  taxId?: string;
  onTaxIdChange?: (value: string) => void;
  taxIdError?: string;
};

export function CompanyProfileFields({
  values,
  errors = {},
  onChange,
  showTaxId,
  taxId,
  onTaxIdChange,
  taxIdError,
}: CompanyProfileFieldsProps) {
  function handleCountryChange(code: string) {
    onChange("country", code);
    onChange("currency", defaultCurrencyForCountry(code));
  }

  return (
    <div className="space-y-6">
      <FormSection
        title="Business details"
        description="Core information that appears on your invoices."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Company name"
            id="name"
            value={values.name}
            onChange={(value) => onChange("name", value)}
            error={errors.name}
            required
            placeholder="Acme Plumbing LLC"
            autoComplete="organization"
          />
          <FormField
            label="Business email"
            id="email"
            type="email"
            value={values.email ?? ""}
            onChange={(value) => onChange("email", value)}
            error={errors.email}
            placeholder="hello@company.com"
            autoComplete="email"
          />
          <PhoneInput
            value={values.phone ?? ""}
            country={values.country}
            onChange={(value) => onChange("phone", value)}
            error={errors.phone}
          />
          {showTaxId && onTaxIdChange && (
            <FormField
              label="Tax ID"
              id="taxId"
              value={taxId ?? ""}
              onChange={onTaxIdChange}
              error={taxIdError}
              placeholder="EIN / VAT number"
            />
          )}
        </div>
      </FormSection>

      <FormSection
        title="Business address"
        description="Search your address to auto-fill the remaining fields."
      >
        <AddressFields
          values={values}
          defaultCountry={values.country}
          onChange={(patch) => {
            for (const [key, value] of Object.entries(patch) as Array<
              [keyof CompanyProfileInput, string]
            >) {
              onChange(key, value);
            }
          }}
          errors={{
            zip: errors.zip,
          }}
        />
        <CountrySelect
          value={values.country}
          onChange={handleCountryChange}
          error={errors.country}
        />
      </FormSection>

      <FormSection
        title="Regional preferences"
        description="Defaults for currency, language, and invoice formatting."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CurrencySelect
            value={values.currency}
            onChange={(value) => onChange("currency", value)}
            error={errors.currency}
          />
          <LocaleSelect
            value={values.locale}
            onChange={(value) => onChange("locale", value)}
            error={errors.locale}
          />
        </div>
      </FormSection>
    </div>
  );
}
