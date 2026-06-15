"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { companyOnboardingSchema, type CompanyOnboardingInput } from "@/lib/schemas/invoice";

const defaultValues: CompanyOnboardingInput = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  currency: "USD",
  locale: "en",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<CompanyOnboardingInput>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function updateField<K extends keyof CompanyOnboardingInput>(
    key: K,
    value: CompanyOnboardingInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);

    const parsed = companyOnboardingSchema.safeParse(form);
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
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create company");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl py-12">
      <h1 className="text-2xl font-bold tracking-tight">Set up your business</h1>
      <p className="mt-2 text-muted-foreground">
        Tell us about your company so we can personalize your invoices.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field
          label="Company name"
          value={form.name}
          onChange={(v) => updateField("name", v)}
          error={errors.name}
          required
        />
        <Field
          label="Business email"
          type="email"
          value={form.email ?? ""}
          onChange={(v) => updateField("email", v)}
          error={errors.email}
        />
        <Field
          label="Phone"
          value={form.phone ?? ""}
          onChange={(v) => updateField("phone", v)}
        />
        <Field
          label="Address"
          value={form.address ?? ""}
          onChange={(v) => updateField("address", v)}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" value={form.city ?? ""} onChange={(v) => updateField("city", v)} />
          <Field label="State" value={form.state ?? ""} onChange={(v) => updateField("state", v)} />
          <Field label="ZIP" value={form.zip ?? ""} onChange={(v) => updateField("zip", v)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Country"
            value={form.country}
            onChange={(v) => updateField("country", v)}
          />
          <Field
            label="Currency"
            value={form.currency}
            onChange={(v) => updateField("currency", v.toUpperCase())}
          />
        </div>

        {serverError && (
          <p className="text-sm text-red-600" role="alert">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Continue to dashboard"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      )}
    </label>
  );
}
