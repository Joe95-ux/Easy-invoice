"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormStepProgress } from "@/components/forms/form-step-progress";
import { CompanyBrandOptions } from "@/components/forms/company-brand-options";
import { CompanyLogoUpload } from "@/components/forms/company-logo-upload";
import { AddressFields } from "@/components/forms/address-fields";
import { CountrySelect, defaultCurrencyForCountry } from "@/components/forms/country-select";
import { CurrencySelect } from "@/components/forms/currency-select";
import { FormField } from "@/components/forms/form-field";
import { LocaleSelect } from "@/components/forms/locale-select";
import { PhoneInput } from "@/components/forms/phone-input";
import { FormCard } from "@/components/forms/form-card";
import { zodFieldErrors } from "@/lib/validation/zod";
import {
  normalizeLogoBg,
  normalizeLogoPlacement,
  type LogoBg,
  type LogoPlacement,
} from "@/lib/company-branding";
import {
  companySettingsSchema,
  type CompanySettingsInput,
} from "@/lib/schemas/company";

type CompanySettingsFormProps = {
  initialValues: CompanySettingsInput;
  initialLogoUrl?: string | null;
};

const STEPS = [
  { id: "brand", title: "Brand", description: "Logo, colors, and document styling" },
  { id: "contact", title: "Contact", description: "How clients reach you" },
  { id: "address", title: "Address", description: "Business location" },
  { id: "preferences", title: "Preferences", description: "Currency and locale defaults" },
] as const;

export function CompanySettingsForm({
  initialValues,
  initialLogoUrl = null,
}: CompanySettingsFormProps) {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CompanySettingsInput>(initialValues);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof CompanySettingsInput>(
    key: K,
    value: CompanySettingsInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCountryChange(code: string) {
    updateField("country", code);
    updateField("currency", defaultCurrencyForCountry(code));
  }

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();

    const parsed = companySettingsSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      toast.error("Fix the highlighted fields before saving.");
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const response = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save");

      toast.success("Company settings saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (step < STEPS.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    void handleSubmit();
  }

  return (
    <FormCard
      title="Company profile"
      description="Complete each step — your details appear on every invoice."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || submitting}
            onClick={() => setStep((value) => value - 1)}
          >
            Back
          </Button>
          <div className="flex gap-2">
            {step === STEPS.length - 1 && (
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Saving..." : "Save now"}
              </Button>
            )}
            <Button type="button" disabled={submitting} onClick={goNext}>
              {submitting
                ? "Saving..."
                : step === STEPS.length - 1
                  ? "Save & finish"
                  : "Continue"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <FormStepProgress steps={STEPS} step={step} onStepChange={setStep} />

        <form id="company-settings-form" onSubmit={handleSubmit} className="space-y-6">
          {step === 0 && (
            <div className="space-y-6">
              <CompanyLogoUpload
                logoUrl={logoUrl}
                onLogoChange={setLogoUrl}
                logoBg={normalizeLogoBg(form.logoBg)}
                suggestedImageUrl={user?.imageUrl}
              />
              <CompanyBrandOptions
                logoBg={normalizeLogoBg(form.logoBg)}
                logoPlacement={normalizeLogoPlacement(form.logoPlacement)}
                brandColor={form.brandColor ?? null}
                onLogoBgChange={(value) => updateField("logoBg", value)}
                onLogoPlacementChange={(value) => updateField("logoPlacement", value)}
                onBrandColorChange={(value) => updateField("brandColor", value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Company name"
                  id="name"
                  value={form.name}
                  onChange={(value) => updateField("name", value)}
                  error={errors.name}
                  required
                  placeholder="Acme Plumbing LLC"
                  autoComplete="organization"
                />
                <FormField
                  label="Business email"
                  id="email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(value) => updateField("email", value)}
                  error={errors.email}
                  placeholder="hello@company.com"
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <PhoneInput
                value={form.phone ?? ""}
                country={form.country}
                onChange={(value) => updateField("phone", value)}
                error={errors.phone}
              />
              <FormField
                label="Tax ID"
                id="taxId"
                value={form.taxId ?? ""}
                onChange={(value) => updateField("taxId", value)}
                error={errors.taxId}
                placeholder="EIN / VAT number"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <AddressFields
                values={form}
                defaultCountry={form.country}
                onChange={(patch) => {
                  for (const [key, value] of Object.entries(patch) as Array<
                    [keyof CompanySettingsInput, string]
                  >) {
                    updateField(key, value);
                  }
                }}
                errors={{ zip: errors.zip }}
              />
              <CountrySelect
                value={form.country}
                onChange={handleCountryChange}
                error={errors.country}
              />
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <CurrencySelect
                value={form.currency}
                onChange={(value) => updateField("currency", value)}
                error={errors.currency}
              />
              <LocaleSelect
                value={form.locale}
                onChange={(value) => updateField("locale", value)}
                error={errors.locale}
              />
              <FormField
                label="Default hourly rate"
                id="defaultHourlyRate"
                type="number"
                value={form.defaultHourlyRate?.toString() ?? ""}
                onChange={(value) =>
                  updateField(
                    "defaultHourlyRate",
                    value === "" ? null : Number(value),
                  )
                }
                error={errors.defaultHourlyRate}
                placeholder="e.g. 90"
                description="Pre-fills new time entries. You can override per entry."
              />
            </div>
          )}
        </form>
      </div>
    </FormCard>
  );
}
