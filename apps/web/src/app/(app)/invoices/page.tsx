import { requireMember } from "@/lib/auth";
import { getInvoicesForMember } from "@/lib/invoice-service";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments";
import { normalizeCustomFieldValues } from "@/lib/custom-fields";
import { canDeleteDocuments, canWriteDocuments } from "@/lib/team";
import { InvoicesTable } from "@/features/invoices/components/invoices-table";
import Link from "next/link";
import { FileTextIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";

function customFieldsSearchText(raw: unknown): string {
  return Object.values(normalizeCustomFieldValues(raw))
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

export default async function InvoicesPage() {
  const member = await requireMember();
  const canWrite = canWriteDocuments(member.role);
  const canDelete = canDeleteDocuments(member.role);
  const invoices = await getInvoicesForMember(member.companyId);

  const rows = invoices.map((invoice) => {
    const paymentSummary = buildInvoicePaymentSummary(invoice);
    return {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      total: invoice.total.toString(),
      balanceDue: paymentSummary.balanceDue.toString(),
      currency: invoice.currency,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      clientId: invoice.clientId,
      clientName: invoice.client?.name ?? null,
      clientEmail: invoice.client?.email ?? null,
      customFieldsSearch: customFieldsSearchText(invoice.customFields),
    };
  });

  return (
    <PageScroll>
      <PageHeader
        title="Invoices"
        description="Track, send, and manage every invoice in one place."
        actions={
          canWrite ? (
            <Button className={pageHeaderActionClass} render={<Link href="/invoices/new" />}>
              <PlusIcon className="size-4" />
              New invoice
            </Button>
          ) : undefined
        }
      />

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title="No invoices yet"
          description="Create your first invoice in under a minute — by form or with AI."
          action={
            canWrite ? (
              <Button render={<Link href="/invoices/new" />}>
                <PlusIcon className="size-4" />
                Create your first invoice
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <InvoicesTable
            invoices={rows}
            companyName={member.company.name}
            canWrite={canWrite}
            canDelete={canDelete}
          />
        </Card>
      )}
    </PageScroll>
  );
}
