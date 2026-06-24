"use client";

import { FormField } from "@/components/forms/form-field";
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
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Company name"
          id="name"
          value={values.name}
          onChange={(v) => onChange("name", v)}
          error={errors.name}
          required
        />
        <FormField
          label="Business email"
          id="email"
          type="email"
          value={values.email ?? ""}
          onChange={(v) => onChange("email", v)}
          error={errors.email}
        />
        <FormField
          label="Phone"
          id="phone"
          value={values.phone ?? ""}
          onChange={(v) => onChange("phone", v)}
        />
        {showTaxId && onTaxIdChange && (
          <FormField
            label="Tax ID"
            id="taxId"
            value={taxId ?? ""}
            onChange={onTaxIdChange}
            error={taxIdError}
          />
        )}
      </div>

      <FormField
        label="Address"
        id="address"
        value={values.address ?? ""}
        onChange={(v) => onChange("address", v)}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="City" id="city" value={values.city ?? ""} onChange={(v) => onChange("city", v)} />
        <FormField label="State" id="state" value={values.state ?? ""} onChange={(v) => onChange("state", v)} />
        <FormField label="ZIP" id="zip" value={values.zip ?? ""} onChange={(v) => onChange("zip", v)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Country" id="country" value={values.country} onChange={(v) => onChange("country", v)} />
        <FormField
          label="Currency"
          id="currency"
          value={values.currency}
          onChange={(v) => onChange("currency", v.toUpperCase())}
        />
        <FormField label="Locale" id="locale" value={values.locale} onChange={(v) => onChange("locale", v)} />
      </div>
    </>
  );
}
