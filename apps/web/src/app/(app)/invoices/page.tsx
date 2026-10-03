import { requireMember } from "@/lib/auth";
import { listInvoicesForMember } from "@/lib/invoice-service";
import { canDeleteDocuments, canWriteDocuments } from "@/lib/team";
import { InvoicesTable } from "@/features/invoices/components/invoices-table";
import Link from "next/link";
import { FileTextIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";

export default async function InvoicesPage() {
  const member = await requireMember();
  const canWrite = canWriteDocuments(member.role);
  const canDelete = canDeleteDocuments(member.role);
  const list = await listInvoicesForMember({
    companyId: member.companyId,
    page: 1,
    pageSize: 15,
    sortKey: "dueDate",
    sortDir: "desc",
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

      {list.totalCount === 0 ? (
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
            initialRows={list.rows}
            initialTotalCount={list.totalCount}
            initialPage={list.page}
            initialPageSize={list.pageSize}
            initialPageCount={list.pageCount}
            companyName={member.company.name}
            celebrateInvoicePaid={member.celebrateInvoicePaid}
            canWrite={canWrite}
            canDelete={canDelete}
          />
        </Card>
      )}
    </PageScroll>
  );
}
