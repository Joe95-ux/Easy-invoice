import { requireMember } from "@/lib/auth";
import { getInvoicesForMember } from "@/lib/invoice-service";
import { InvoicesTable } from "@/features/invoices/components/invoices-table";
import Link from "next/link";
import { FileTextIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EmptyState, PageHeader } from "@/components/app-shell/page-header";

export default async function InvoicesPage() {
  const member = await requireMember();
  const invoices = await getInvoicesForMember(member.companyId);

  const rows = invoices.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    total: invoice.total.toString(),
    currency: invoice.currency,
    dueDate: invoice.dueDate?.toISOString() ?? null,
    clientName: invoice.client?.name ?? null,
  }));

  return (
    <PageScroll>
      <PageHeader
        title="Invoices"
        description="Track, send, and manage every invoice in one place."
        actions={
          <Button render={<Link href="/invoices/new" />}>
            <PlusIcon className="size-4" />
            New invoice
          </Button>
        }
      />

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title="No invoices yet"
          description="Create your first invoice in under a minute — by form or with AI."
          action={
            <Button render={<Link href="/invoices/new" />}>
              <PlusIcon className="size-4" />
              Create your first invoice
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <InvoicesTable invoices={rows} />
        </Card>
      )}
    </PageScroll>
  );
}
