"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RecordRefundDialog } from "@/features/credit-notes/components/record-refund-dialog";
import { formatDate, formatMoney } from "@/lib/invoices";
import { creditNoteStatusLabel, creditNoteStatusVariant } from "@/lib/credit-notes";
import type { CreditNoteStatus, InvoiceStatus } from "@easy-invoice/db";

type CreditNoteRow = {
  id: string;
  number: string;
  status: CreditNoteStatus;
  kind: "CREDIT" | "VOID";
  total: number;
  issueDate: string;
  reason: string | null;
};

type InvoiceCreditNotesSectionProps = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: InvoiceStatus;
  currency: string;
  amountCredited: number;
  refundDue: number;
  remainingInvoice: number;
  creditNotes: CreditNoteRow[];
  canWrite?: boolean;
};

export function InvoiceCreditNotesSection({
  invoiceId,
  invoiceNumber,
  invoiceStatus,
  currency,
  amountCredited,
  refundDue,
  remainingInvoice,
  creditNotes,
  canWrite = true,
}: InvoiceCreditNotesSectionProps) {
  const router = useRouter();
  const [refundOpen, setRefundOpen] = useState(false);
  const latestIssuedCreditNoteId =
    creditNotes.find((note) => note.status === "ISSUED")?.id ?? null;
  const canCredit =
    canWrite &&
    invoiceStatus !== "DRAFT" &&
    invoiceStatus !== "CANCELLED" &&
    remainingInvoice > 0.001;

  return (
    <Card className="mt-6">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Credit notes</CardTitle>
          <CardDescription>
            Credits reduce this invoice without rewriting what was sent.
            {amountCredited > 0.001
              ? ` ${formatMoney(amountCredited, currency)} credited.`
              : ""}
            {refundDue > 0.001
              ? ` ${formatMoney(refundDue, currency)} is owed back to the client.`
              : ""}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {canWrite && refundDue > 0.001 ? (
            <Button variant="outline" size="sm" onClick={() => setRefundOpen(true)}>
              Record refund
            </Button>
          ) : null}
          {canCredit ? (
            <Button size="sm" render={<Link href={`/credit-notes/new?invoiceId=${invoiceId}`} />}>
              Issue credit
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {creditNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No credit notes yet. Use this when a sent invoice needs a correction, a return, or a
            void.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credit note</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditNotes.map((note) => (
                <TableRow
                  key={note.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/credit-notes/${note.id}`)}
                >
                  <TableCell className="font-medium">
                    <Link href={`/credit-notes/${note.id}`} className="hover:underline">
                      {note.number}
                    </Link>
                    {note.kind === "VOID" ? (
                      <span className="ml-2 text-xs text-muted-foreground">Void</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{formatDate(note.issueDate)}</TableCell>
                  <TableCell>
                    <Badge variant={creditNoteStatusVariant(note.status)}>
                      {creditNoteStatusLabel(note.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-56 truncate">{note.reason ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(note.total, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <RecordRefundDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        currency={currency}
        refundDue={refundDue}
        creditNoteId={latestIssuedCreditNoteId}
      />
    </Card>
  );
}
