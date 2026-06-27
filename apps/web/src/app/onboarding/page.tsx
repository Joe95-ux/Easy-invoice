"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyLogoUpload } from "@/components/forms/company-logo-upload";
import { CompanyProfileFields } from "@/components/forms/company-profile-fields";
import { uploadPendingCompanyLogo } from "@/lib/company-logo-client";
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
  const { user } = useUser();
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
        throw new Error(body.error ?? "Failed to create company");
      }

      try {
        await uploadPendingCompanyLogo({
          file: pendingLogoFile,
          sourceUrl:
            useProfilePhotoAsLogo && user?.imageUrl ? user.imageUrl : null,
        });
      } catch {
        toast.message("Company created, but logo upload failed. Add it in Settings.");
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
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <SparklesIcon className="size-3.5 text-primary" />
            Welcome to Easy Invoice
          </div>
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Set up your business</h1>
            <p className="mt-3 text-muted-foreground">
              A polished profile means professional invoices from day one — logo, address,
              and regional settings all in one place.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Smart defaults</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Address search auto-fills city, state, and postal code</li>
              <li>Country selection updates currency automatically</li>
              <li>Your sign-up photo can become your company logo</li>
            </ul>
          </div>
        </div>

        <Card className="flex max-h-[calc(100svh-5rem)] flex-col overflow-hidden border-border/70 shadow-lg lg:col-span-3">
          <CardHeader className="shrink-0 border-b border-border/60 bg-muted/20">
            <CardTitle>Company profile</CardTitle>
            <CardDescription>
              This information appears on invoices you send to clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-6">
            <form id="onboarding-form" onSubmit={handleSubmit} className="space-y-6">
              <CompanyLogoUpload
                logoUrl={logoPreview}
                onLogoChange={setLogoPreview}
                mode="deferred"
                suggestedImageUrl={user?.imageUrl}
                onPendingFileChange={setPendingLogoFile}
                onSuggestedLogoSelect={setUseProfilePhotoAsLogo}
              />

              <CompanyProfileFields values={form} errors={errors} onChange={updateField} />
            </form>
          </CardContent>
          <div className="shrink-0 border-t border-border/60 bg-card px-6 py-4">
            <Button
              type="submit"
              form="onboarding-form"
              disabled={submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? "Creating your workspace..." : "Continue to dashboard"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
