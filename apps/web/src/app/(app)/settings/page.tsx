import Link from "next/link";
import { BellIcon, UsersRoundIcon } from "lucide-react";
import { CompanySettingsForm } from "@/features/settings/components/company-settings-form";
import { ReminderSettingsSection } from "@/features/settings/components/reminder-settings-section";
import { SettingsDefaultTemplateSection } from "@/features/settings/components/settings-default-template-section";
import { SettingsSectionNav } from "@/features/settings/components/settings-section-nav";
import { requireCompanyAdmin } from "@/lib/auth";
import { getDefaultTemplateId, getTemplatesForCompany } from "@/lib/templates";
import { normalizeLogoBg, normalizeLogoPlacement } from "@/lib/company-branding";
import { reminderSettingsFromCompany } from "@/lib/reminders/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";

export default async function SettingsPage() {
  const member = await requireCompanyAdmin();

  const [templates, defaultTemplateId] = await Promise.all([
    getTemplatesForCompany(member.companyId),
    getDefaultTemplateId(member.companyId),
  ]);
  const { company } = member;

  const companyPreview = {
    name: company.name,
    logoUrl: company.logoUrl,
    logoBg: normalizeLogoBg(company.logoBg),
    logoPlacement: normalizeLogoPlacement(company.logoPlacement),
    brandColor: company.brandColor,
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
      <PageHeader
        title="Settings"
        description="Manage your company profile and invoice preferences."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              render={<Link href="/members" />}
            >
              <UsersRoundIcon className="size-4" />
              Members
            </Button>
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              render={<Link href="/settings/notifications" />}
            >
              <BellIcon className="size-4" />
              Notifications
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <SettingsSectionNav />

        <CompanySettingsForm
          initialLogoUrl={company.logoUrl}
          companyId={company.id}
          invoiceSequence={company.invoiceSequence}
          estimateSequence={company.estimateSequence}
          receiptSequence={company.receiptSequence}
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
            documentPrefix: company.documentPrefix,
            defaultHourlyRate: company.defaultHourlyRate
              ? Number(company.defaultHourlyRate)
              : null,
            logoBg: normalizeLogoBg(company.logoBg),
            logoPlacement: normalizeLogoPlacement(company.logoPlacement),
            brandColor: company.brandColor,
          }}
        />

        <section id="settings-templates" className="scroll-mt-20">
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
        </section>

        <section id="settings-reminders" className="scroll-mt-20">
          <ReminderSettingsSection
            initialSettings={reminderSettingsFromCompany(company)}
          />
        </section>
      </div>
    </PageScroll>
  );
}
