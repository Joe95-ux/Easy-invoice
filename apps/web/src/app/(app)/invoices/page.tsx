import { requireMember } from "@/lib/auth";
import { listInvoicesForMember } from "@/lib/invoice-service";
import { canDeleteDocuments, canWriteDocuments } from "@/lib/team";
import { InvoicesTable } from "@/features/invoices/components/invoices-table";
import Link from "next/link";
import { FileTextIcon, PlusIcon, SparklesIcon } from "lucide-react";
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
            <Button
              className={pageHeaderActionClass}
              render={<Link href={list.totalCount === 0 ? "/invoices/new?tab=ai" : "/invoices/new"} />}
            >
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
          description="Describe the job in your own words, or fill in the form — either way takes about a minute."
          action={
            canWrite ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button render={<Link href="/invoices/new?tab=ai" />}>
                  <SparklesIcon className="size-4" />
                  Describe with AI
                </Button>
                <Button variant="outline" render={<Link href="/invoices/new?tab=form" />}>
                  <PlusIcon className="size-4" />
                  Use the form
                </Button>
              </div>
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
