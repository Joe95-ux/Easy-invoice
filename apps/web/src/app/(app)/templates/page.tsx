import { PageScroll } from "@/components/app-shell/app-shell";
import { TemplatesExplorer } from "@/features/templates/components/templates-explorer";
import { requireMember } from "@/lib/auth";
import { getDefaultTemplateId, getTemplatesForCompany } from "@/lib/templates";

export default async function TemplatesPage() {
  const member = await requireMember();
  const { company } = member;

  const [templates, defaultTemplateId] = await Promise.all([
    getTemplatesForCompany(member.companyId),
    getDefaultTemplateId(member.companyId),
  ]);

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
    <PageScroll fullWidth>
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Browse every layout available for your invoices and estimates. Preview with sample
          data, select a favorite, and it becomes your default for new documents.
        </p>
      </div>

      <TemplatesExplorer
        templates={templates}
        defaultTemplateId={defaultTemplateId ?? templates[0]?.id ?? ""}
        company={companyPreview}
        currency={company.currency}
      />
    </PageScroll>
  );
}
