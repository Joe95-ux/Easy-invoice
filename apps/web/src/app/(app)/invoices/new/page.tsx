import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink } from "@/components/app-shell/page-header";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { getDefaultTemplateId, getTemplatesForCompany } from "@/lib/templates";
import { InvoiceCreator } from "@/features/invoices/components/invoice-creator";

type PageProps = { searchParams: Promise<{ clientId?: string }> };

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const member = await requireMember();

  const { clientId } = await searchParams;
  const [clients, templates, defaultTemplateId] = await Promise.all([
    getClientsForMember(member.companyId),
    getTemplatesForCompany(member.companyId),
    getDefaultTemplateId(member.companyId),
  ]);

  return (
    <PageScroll>
      <PageBackLink href="/invoices">Back to invoices</PageBackLink>
      <InvoiceCreator
        currency={member.company.currency}
        company={{
          name: member.company.name,
          logoUrl: member.company.logoUrl,
          email: member.company.email,
          phone: member.company.phone,
          address: member.company.address,
          city: member.company.city,
          state: member.company.state,
          zip: member.company.zip,
          country: member.company.country,
        }}
        clients={clients}
        templates={templates}
        initialClientId={clientId}
        defaultTemplateId={defaultTemplateId}
      />
    </PageScroll>
  );
}
