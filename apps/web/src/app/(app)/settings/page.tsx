import { redirect } from "next/navigation";
import { CompanySettingsForm } from "@/features/settings/components/company-settings-form";
import { getCurrentMember } from "@/lib/auth";
import { getTemplatesForCompany } from "@/lib/templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const templates = await getTemplatesForCompany(member.companyId);
  const { company } = member;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your company profile and invoice preferences
        </p>
      </div>

      <div className="space-y-6">
        <CompanySettingsForm
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
            <p className="mb-4 text-sm text-muted-foreground">
              Choose a template when creating an invoice. Built-in templates are available
              to all companies.
            </p>
            <ul className="space-y-2 text-sm">
              {templates.map((template) => (
                <li
                  key={template.id}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <span className="font-medium">{template.name}</span>
                  <span className="text-muted-foreground">
                    {template.isSystem ? "Built-in" : "Custom"}
                    {template.isDefault ? " · Default" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
