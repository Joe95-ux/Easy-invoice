"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AddressFields } from "@/components/forms/address-fields";
import { CountrySelect } from "@/components/forms/country-select";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { PhoneInput } from "@/components/forms/phone-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field";
import { zodFieldErrors } from "@/lib/validation/zod";
import { clientSchema, type ClientInput } from "@/lib/schemas/client";

const emptyValues: ClientInput = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  notes: "",
};

type ClientFormProps = {
  initialValues?: Partial<ClientInput>;
  submitLabel?: string;
  formId?: string;
  showSubmit?: boolean;
  onSubmit: (data: ClientInput) => Promise<void>;
};

export function ClientForm({
  initialValues,
  submitLabel = "Save client",
  formId = "client-form",
  showSubmit = true,
  onSubmit,
}: ClientFormProps) {
  const [form, setForm] = useState<ClientInput>({ ...emptyValues, ...initialValues });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = clientSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
      <FormSection
        title="Contact details"
        description="Who you're billing and how to reach them."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Name"
            id="name"
            value={form.name}
            onChange={(value) => updateField("name", value)}
            error={errors.name}
            required
            placeholder="Client or company name"
          />
          <FormField
            label="Email"
            id="email"
            type="email"
            value={form.email ?? ""}
            onChange={(value) => updateField("email", value)}
            error={errors.email}
            placeholder="client@example.com"
          />
          <div className="sm:col-span-2">
            <PhoneInput
              value={form.phone ?? ""}
              country={form.country || "US"}
              onChange={(value) => updateField("phone", value)}
              error={errors.phone}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Billing address"
        description="Search an address or enter it manually."
      >
        <AddressFields
          values={form}
          defaultCountry={form.country || "US"}
          onChange={(patch) => {
            for (const [key, value] of Object.entries(patch) as Array<
              [keyof ClientInput, string]
            >) {
              updateField(key, value);
            }
          }}
        />
        <CountrySelect
          value={form.country || "US"}
          onChange={(value) => updateField("country", value)}
          error={errors.country}
        />
      </FormSection>

      <FormSection title="Notes" description="Optional context for this client.">
        <Field>
          <FieldLabel htmlFor="notes">Internal notes</FieldLabel>
          <FieldContent>
            <Textarea
              id="notes"
              value={form.notes ?? ""}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
              placeholder="Preferred payment method, job history, etc."
            />
          </FieldContent>
        </Field>
      </FormSection>

      {showSubmit && (
        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? "Saving..." : submitLabel}
        </Button>
      )}
    </form>
  );
}
