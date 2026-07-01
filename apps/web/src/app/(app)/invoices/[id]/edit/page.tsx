import { notFound } from "next/navigation";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
import { InvoiceCreator } from "@/features/invoices/components/invoice-creator";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { getInvoiceForMember, getInvoiceLineItemsWithTimeEntries } from "@/lib/invoices";
import { getDefaultTemplateId, getTemplatesForCompany } from "@/lib/templates";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditInvoicePage({ params }: PageProps) {
  const member = await requireMember();

  const { id } = await params;
  const [invoice, clients, templates, defaultTemplateId, lineItemsWithTime] =
    await Promise.all([
    getInvoiceForMember(id, member.companyId),
    getClientsForMember(member.companyId),
    getTemplatesForCompany(member.companyId),
    getDefaultTemplateId(member.companyId),
    getInvoiceLineItemsWithTimeEntries(id, member.companyId),
  ]);
  if (!invoice) notFound();

  return (
    <PageScroll>
      <PageBackLink href={`/invoices/${invoice.id}`}>Back to invoice</PageBackLink>

      <PageHeader
        title={`Edit ${invoice.number}`}
        description="Update the invoice details below."
      />

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
        defaultTemplateId={defaultTemplateId}
        invoiceId={invoice.id}
        invoiceNumber={invoice.number}
        invoiceStatus={invoice.status}
        initialValues={{
          clientId: invoice.clientId,
          templateId: invoice.templateId,
          clientName: invoice.client?.name ?? "",
          clientEmail: invoice.client?.email ?? "",
          clientPhone: invoice.client?.phone ?? "",
          clientAddress: invoice.client?.address ?? "",
          notes: invoice.notes,
          currency: invoice.currency,
          issueDate: invoice.issueDate.toISOString(),
          dueDate: invoice.dueDate?.toISOString() ?? null,
          taxRate: Number(invoice.taxRate),
          discount: Number(invoice.discount),
          lineItems: lineItemsWithTime.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            timeEntryIds: item.timeEntries.map((entry) => entry.id),
          })),
        }}
      />
    </PageScroll>
  );
}
