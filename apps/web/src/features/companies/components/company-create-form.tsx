"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  isPlanApiError,
  throwIfApiError,
  toastApiError,
} from "@/lib/billing/plan-api-error";
import { useCompanyPlan } from "@/components/billing/company-plan-context";
import { ProFeatureGate } from "@/components/billing/pro-feature-gate";
import { Button } from "@/components/ui/button";
import { CompanyLogoUpload } from "@/components/forms/company-logo-upload";
import { CompanyProfileFields } from "@/components/forms/company-profile-fields";
import { uploadPendingCompanyLogo } from "@/lib/company-logo-client";
import {
  companyOnboardingSchema,
  type CompanyOnboardingInput,
} from "@/lib/schemas/company";
import { zodFieldErrors } from "@/lib/validation/zod";

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

type CompanyCreateFormProps = {
  submitLabel: string;
  submittingLabel: string;
  onSuccess?: () => void;
  showCancel?: boolean;
};

export function CompanyCreateForm({
  submitLabel,
  submittingLabel,
  onSuccess,
  showCancel = false,
}: CompanyCreateFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const { isPro } = useCompanyPlan();
  const [form, setForm] = useState<CompanyOnboardingInput>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [useProfilePhotoAsLogo, setUseProfilePhotoAsLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setForm((prev) => ({
      ...prev,
      email: prev.email || user.primaryEmailAddress?.emailAddress || "",
      name: prev.name || user.fullName || "",
    }));
  }, [user]);

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
        throwIfApiError(response, body, "Failed to create company");
      }

      if (isPro && (pendingLogoFile || useProfilePhotoAsLogo)) {
        try {
          await uploadPendingCompanyLogo({
            file: pendingLogoFile,
            sourceUrl:
              useProfilePhotoAsLogo && user?.imageUrl ? user.imageUrl : null,
          });
        } catch (logoError) {
          if (isPlanApiError(logoError)) {
            toast.message(
              "Company created. Logo upload needs Pro — upgrade anytime in Billing.",
            );
          } else {
            toast.message("Company created, but logo upload failed. Add it in Settings.");
          }
        }
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      toastApiError(error, "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isPro ? (
        <CompanyLogoUpload
          logoUrl={logoPreview}
          onLogoChange={setLogoPreview}
          mode="deferred"
          suggestedImageUrl={user?.imageUrl}
          onPendingFileChange={setPendingLogoFile}
          onSuggestedLogoSelect={setUseProfilePhotoAsLogo}
        />
      ) : (
        <ProFeatureGate
          title="Custom logo is on Pro"
          description="Create your company now — upgrade later to add a logo and brand colors on invoices."
        />
      )}

      <CompanyProfileFields values={form} errors={errors} onChange={updateField} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {showCancel && (
          <Button type="button" variant="outline" render={<Link href="/dashboard" />}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="sm:min-w-40">
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
