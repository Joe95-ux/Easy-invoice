"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  companySettingsSchema,
  type CompanySettingsInput,
} from "@/lib/schemas/invoice";

type CompanySettingsFormProps = {
  initialValues: CompanySettingsInput & { taxId?: string | null };
};

export function CompanySettingsForm({ initialValues }: CompanySettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<CompanySettingsInput>({
    name: initialValues.name,
    email: initialValues.email ?? "",
    phone: initialValues.phone ?? "",
    address: initialValues.address ?? "",
    city: initialValues.city ?? "",
    state: initialValues.state ?? "",
    zip: initialValues.zip ?? "",
    country: initialValues.country,
    currency: initialValues.currency,
    locale: initialValues.locale,
    taxId: initialValues.taxId ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof CompanySettingsInput>(
    key: K,
    value: CompanySettingsInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = companySettingsSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Company name"
              id="name"
              value={form.name}
              onChange={(v) => updateField("name", v)}
              error={errors.name}
              required
            />
            <Field
              label="Business email"
              id="email"
              type="email"
              value={form.email ?? ""}
              onChange={(v) => updateField("email", v)}
              error={errors.email}
            />
            <Field
              label="Phone"
              id="phone"
              value={form.phone ?? ""}
              onChange={(v) => updateField("phone", v)}
            />
            <Field
              label="Tax ID"
              id="taxId"
              value={form.taxId ?? ""}
              onChange={(v) => updateField("taxId", v)}
            />
          </div>

          <Field
            label="Address"
            id="address"
            value={form.address ?? ""}
            onChange={(v) => updateField("address", v)}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" id="city" value={form.city ?? ""} onChange={(v) => updateField("city", v)} />
            <Field label="State" id="state" value={form.state ?? ""} onChange={(v) => updateField("state", v)} />
            <Field label="ZIP" id="zip" value={form.zip ?? ""} onChange={(v) => updateField("zip", v)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Country" id="country" value={form.country} onChange={(v) => updateField("country", v)} />
            <Field
              label="Currency"
              id="currency"
              value={form.currency}
              onChange={(v) => updateField("currency", v.toUpperCase())}
            />
            <Field label="Locale" id="locale" value={form.locale} onChange={(v) => updateField("locale", v)} />
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  error,
  type = "text",
  required,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
