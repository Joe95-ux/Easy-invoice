"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CompanyProfileFields } from "@/components/forms/company-profile-fields";
import { zodFieldErrors } from "@/lib/validation/zod";
import {
  companyOnboardingSchema,
  type CompanyOnboardingInput,
} from "@/lib/schemas/company";

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

  function updateField<K extends keyof CompanyOnboardingInput>(
    key: K,
    value: CompanyOnboardingInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = companyOnboardingSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
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
      toast.error(error instanceof Error ? error.message : "Something went wrong");
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

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <CompanyProfileFields values={form} errors={errors} onChange={updateField} />

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating..." : "Continue to dashboard"}
        </Button>
      </form>
    </div>
  );
}
