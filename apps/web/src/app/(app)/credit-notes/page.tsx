import Link from "next/link";
import { FileMinusIcon, PlusIcon } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { canWriteDocuments } from "@/lib/team";
import { listCreditNotesForMember, creditNoteStatusLabel, creditNoteStatusVariant } from "@/lib/credit-notes";
import { formatDate, formatMoney } from "@/lib/invoices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";

export default async function CreditNotesPage() {
  const member = await requireMember();
  const canWrite = canWriteDocuments(member.role);
  const creditNotes = await listCreditNotesForMember(member.companyId);

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

      {creditNotes.length === 0 ? (
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditNotes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="font-medium">
                    <Link href={`/credit-notes/${note.id}`} className="hover:underline">
                      {note.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/invoices/${note.invoice.id}`} className="hover:underline">
                      {note.invoice.number}
                    </Link>
                  </TableCell>
                  <TableCell>{note.client?.name ?? "—"}</TableCell>
                  <TableCell>{formatDate(note.issueDate)}</TableCell>
                  <TableCell>
                    <Badge variant={creditNoteStatusVariant(note.status)}>
                      {creditNoteStatusLabel(note.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatMoney(note.total, note.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageScroll>
  );
}
