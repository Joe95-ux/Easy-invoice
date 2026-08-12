import { PageScroll } from "@/components/app-shell/app-shell";
import { RecurringInvoicesPageContent } from "@/features/recurring-invoices/components/recurring-invoices-page-content";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { getInvoicesForMember } from "@/lib/invoice-service";
import {
  listRecurringInvoices,
  serializeRecurringInvoice,
} from "@/lib/recurring-invoices";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function RecurringInvoicesPage({ searchParams }: PageProps) {
  const member = await requireMember();
  const params = await searchParams;
  const [rows, clients, invoices] = await Promise.all([
    listRecurringInvoices(member.companyId),
    getClientsForMember(member.companyId),
    getInvoicesForMember(member.companyId, 200),
  ]);

  return (
    <PageScroll>
      <RecurringInvoicesPageContent
        initialRows={rows.map(serializeRecurringInvoice)}
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          email: client.email,
        }))}
        invoices={invoices
          .filter((invoice) => invoice.clientId && invoice.status !== "CANCELLED")
          .map((invoice) => ({
            id: invoice.id,
            number: invoice.number,
            clientId: invoice.clientId,
            clientName: invoice.client?.name ?? null,
            clientEmail: invoice.client?.email ?? null,
          }))}
        currency={member.company.currency}
        highlightId={params.id ?? null}
      />
    </PageScroll>
  );
}
