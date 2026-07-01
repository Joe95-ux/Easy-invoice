import { PageScroll } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/app-shell/page-header";
import { CreateDocumentMenu } from "@/components/create-document-menu";
import { TemplatesExplorer } from "@/features/templates/components/templates-explorer";
import { requireCompanyAdmin } from "@/lib/auth";
import { getDefaultTemplateId, getTemplatesForCompany } from "@/lib/templates";

export default async function TemplatesPage() {
  const member = await requireCompanyAdmin();
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
      <PageHeader
        title="Templates"
        description="Browse every layout available for your invoices and estimates. Preview with sample data, select a favorite, and it becomes your default for new documents."
        actions={<CreateDocumentMenu />}
      />

      <TemplatesExplorer
        templates={templates}
        defaultTemplateId={defaultTemplateId ?? templates[0]?.id ?? ""}
        company={companyPreview}
        currency={company.currency}
      />
    </PageScroll>
  );
}
