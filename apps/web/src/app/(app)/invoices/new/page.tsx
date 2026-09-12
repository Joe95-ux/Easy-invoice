import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink } from "@/components/app-shell/page-header";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { companyBrandingFields } from "@/lib/company-branding";
import { normalizeCustomFieldDefinitions } from "@/lib/custom-fields";
import { prisma } from "@/lib/db";
import { getDefaultTemplateId, getTemplatesForCompany } from "@/lib/templates";
import { InvoiceCreator } from "@/features/invoices/components/invoice-creator";

type PageProps = {
  searchParams: Promise<{
    clientId?: string;
    projectId?: string;
    addTime?: string;
    timeEntryIds?: string;
    expenseIds?: string;
  }>;
};

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const member = await requireMember();

  const { clientId, projectId, addTime, timeEntryIds, expenseIds } = await searchParams;
  const preselectedTimeEntryIds = timeEntryIds
    ? timeEntryIds.split(",").filter(Boolean)
    : [];
  const preselectedExpenseIds = expenseIds
    ? expenseIds.split(",").filter(Boolean)
    : [];

  const [clients, templates, defaultTemplateId, project] = await Promise.all([
    getClientsForMember(member.companyId),
    getTemplatesForCompany(member.companyId),
    getDefaultTemplateId(member.companyId),
    projectId
      ? prisma.project.findFirst({
          where: { id: projectId, companyId: member.companyId },
          select: { id: true, currency: true, clientId: true },
        })
      : Promise.resolve(null),
  ]);

  const resolvedClientId = clientId || project?.clientId || undefined;
  const currency = project?.currency || member.company.currency;

  return (
    <PageScroll>
      <PageBackLink href={projectId ? `/projects/${projectId}` : "/invoices"}>
        {projectId ? "Back to project" : "Back to invoices"}
      </PageBackLink>
      <InvoiceCreator
        currency={currency}
        company={{
          name: member.company.name,
          logoUrl: member.company.logoUrl,
          ...companyBrandingFields(member.company),
          email: member.company.email,
          phone: member.company.phone,
          address: member.company.address,
          city: member.company.city,
          state: member.company.state,
          zip: member.company.zip,
          country: member.company.country,
        }}
        customFieldDefinitions={normalizeCustomFieldDefinitions(
          member.company.customFieldDefinitions,
        )}
        clients={clients}
        templates={templates}
        initialClientId={resolvedClientId}
        initialProjectId={project?.id ?? projectId}
        defaultTemplateId={defaultTemplateId}
        autoOpenTimeDialog={addTime === "1"}
        preselectedTimeEntryIds={preselectedTimeEntryIds}
        preselectedExpenseIds={preselectedExpenseIds}
      />
    </PageScroll>
  );
}
