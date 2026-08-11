import { PageScroll } from "@/components/app-shell/app-shell";
import { RecurringInvoicesPageContent } from "@/features/recurring-invoices/components/recurring-invoices-page-content";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import {
  listRecurringInvoices,
  serializeRecurringInvoice,
} from "@/lib/recurring-invoices";

export default async function RecurringInvoicesPage() {
  const member = await requireMember();
  const [rows, clients] = await Promise.all([
    listRecurringInvoices(member.companyId),
    getClientsForMember(member.companyId),
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
        currency={member.company.currency}
      />
    </PageScroll>
  );
}
