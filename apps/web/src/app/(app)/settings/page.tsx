import { CompanySettingsForm } from "@/features/settings/components/company-settings-form";
import { SettingsDefaultTemplateSection } from "@/features/settings/components/settings-default-template-section";
import { requireMember } from "@/lib/auth";
import { getDefaultTemplateId, getTemplatesForCompany } from "@/lib/templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageScroll } from "@/components/app-shell/app-shell";

export default async function SettingsPage() {
  const member = await requireMember();

  const [templates, defaultTemplateId] = await Promise.all([
    getTemplatesForCompany(member.companyId),
    getDefaultTemplateId(member.companyId),
  ]);
  const { company } = member;

  const companyPreview = {
    name: company.name,
    logoUrl: company.logoUrl,
    email: company.email,
    phone: company.phone,
    address: company.address,
    city: company.city,
    state: company.state,
    zip: company.zip,
    country: company.country,
  };

  return (
    <PageScroll>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your company profile and invoice preferences.
        </p>
      </div>

      <div className="space-y-6">
        <CompanySettingsForm
          initialLogoUrl={company.logoUrl}
          initialValues={{
            name: company.name,
            email: company.email ?? "",
            phone: company.phone ?? "",
            address: company.address ?? "",
            city: company.city ?? "",
            state: company.state ?? "",
            zip: company.zip ?? "",
            country: company.country,
            currency: company.currency,
            locale: company.locale,
            taxId: company.taxId ?? "",
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Invoice templates</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsDefaultTemplateSection
              templates={templates}
              defaultTemplateId={defaultTemplateId ?? templates[0]?.id ?? ""}
              company={companyPreview}
              currency={company.currency}
            />
          </CardContent>
        </Card>
      </div>
    </PageScroll>
  );
}
