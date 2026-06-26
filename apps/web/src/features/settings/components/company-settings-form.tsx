"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyProfileFields } from "@/components/forms/company-profile-fields";
import { CompanyLogoUpload } from "@/components/forms/company-logo-upload";
import { zodFieldErrors } from "@/lib/validation/zod";
import {
  companySettingsSchema,
  type CompanySettingsInput,
} from "@/lib/schemas/company";

type CompanySettingsFormProps = {
  initialValues: CompanySettingsInput;
  initialLogoUrl?: string | null;
};

export function CompanySettingsForm({
  initialValues,
  initialLogoUrl = null,
}: CompanySettingsFormProps) {
  const router = useRouter();
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = companySettingsSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
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
          <CompanyLogoUpload logoUrl={logoUrl} onLogoChange={setLogoUrl} />

          <CompanyProfileFields
            values={form}
            errors={errors}
            onChange={updateField}
            showTaxId
            taxId={form.taxId ?? ""}
            onTaxIdChange={(v) => updateField("taxId", v)}
            taxIdError={errors.taxId}
          />

          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
