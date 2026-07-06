"use client";

import Link from "next/link";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadReceiptPdf } from "@/lib/receipt-pdf-client";
import type { ClientReceiptRow } from "@/lib/clients/financial-profile";
import { formatDate, formatMoney } from "@/lib/invoices";
import { sanitizePdfFilename } from "@/lib/pdf-filename";

type ClientReceiptsTableProps = {
  receipts: ClientReceiptRow[];
};

export function ClientReceiptsTable({ receipts }: ClientReceiptsTableProps) {
  async function handleDownload(receipt: ClientReceiptRow) {
    const filename = sanitizePdfFilename(receipt.receiptNumber);
    if (!filename) return;
    await downloadReceiptPdf(receipt.invoiceId, receipt.id, filename);
  }

  return (
    <Table stickyColumns={1} stickyColumnWidths={["6rem"]}>
      <TableHeader>
        <TableRow>
          <TableHead>Receipt</TableHead>
          <TableHead>Invoice</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-14 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {receipts.map((receipt) => (
          <TableRow key={receipt.id}>
            <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
            <TableCell>
              <Link
                href={`/invoices/${receipt.invoiceId}`}
                className="text-primary hover:underline"
              >
                {receipt.invoiceNumber}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(receipt.paidAt)}</TableCell>
            <TableCell>{receipt.method}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(receipt.amount, receipt.currency)}
            </TableCell>
            <TableCell className="text-right">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Download receipt ${receipt.receiptNumber}`}
                onClick={() => void handleDownload(receipt)}
              >
                <DownloadIcon className="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
