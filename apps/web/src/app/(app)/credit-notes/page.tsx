import Link from "next/link";
import { FileMinusIcon, PlusIcon } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { canDeleteDocuments, canWriteDocuments } from "@/lib/team";
import { listCreditNotesForMember } from "@/lib/credit-notes";
import { serializeCreditNoteListRow } from "@/lib/credit-note-display";
import { CreditNotesTable } from "@/features/credit-notes/components/credit-notes-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";

export default async function CreditNotesPage() {
  const member = await requireMember();
  const canWrite = canWriteDocuments(member.role);
  const canDelete = canDeleteDocuments(member.role);
  const creditNotes = await listCreditNotesForMember(member.companyId);
  const rows = creditNotes.map(serializeCreditNoteListRow);

  return (
    <PageScroll>
      <PageHeader
        title="Credit notes"
        description="Reverse a sent invoice without rewriting history. Void unpaid invoices, or credit and refund when money came in."
        actions={
          canWrite ? (
            <Button className={pageHeaderActionClass} render={<Link href="/credit-notes/new" />}>
              <PlusIcon className="size-4" />
              New credit note
            </Button>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={FileMinusIcon}
          title="No credit notes yet"
          description="Issue a credit from an invoice when you need to correct, return, or void a sent claim."
          action={
            canWrite ? (
              <Button render={<Link href="/credit-notes/new" />}>
                <PlusIcon className="size-4" />
                Create a credit note
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <CreditNotesTable
            notes={rows}
            companyName={member.company.name}
            canWrite={canWrite}
            canDelete={canDelete}
          />
        </Card>
      )}
    </PageScroll>
  );
}
