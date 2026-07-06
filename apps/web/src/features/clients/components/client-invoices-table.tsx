"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoicePreviewSheet } from "@/features/invoices/components/invoice-preview-sheet";
import { InvoiceSendDialog } from "@/features/invoices/components/invoice-send-dialog";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import type { InvoiceStatus } from "@easy-invoice/db";
import {
  formatDate,
  formatMoney,
  invoiceStatusLabel,
  invoiceStatusVariant,
} from "@/lib/invoices";

export type ClientInvoiceRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: number;
  balanceDue?: number;
  currency: string;
  dueDate?: string | null;
};

type ClientInvoicesTableProps = {
  invoices: ClientInvoiceRow[];
  companyName: string;
  clientEmail?: string | null;
  detailed?: boolean;
};

export function ClientInvoicesTable({
  invoices,
  companyName,
  clientEmail,
  detailed = false,
}: ClientInvoicesTableProps) {
  const router = useRouter();
  const { openPdfDownload, pdfDownloadDialog } = usePdfDownload();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendInvoice, setSendInvoice] = useState<ClientInvoiceRow | null>(null);

  function openPreview(invoiceId: string) {
    setPreviewId(invoiceId);
    setPreviewOpen(true);
  }

  function handleDownload(invoice: ClientInvoiceRow) {
    openPdfDownload({
      kind: "invoice",
      documentId: invoice.id,
      documentNumber: invoice.number,
      companyName,
    });
  }

  async function handleDelete(invoice: ClientInvoiceRow) {
    if (!confirm(`Delete invoice ${invoice.number}?`)) return;

    setLoadingId(invoice.id);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Invoice deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete invoice");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      <Table stickyColumns={1} stickyColumnWidths={["5rem"]}>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Status</TableHead>
            {detailed && <TableHead className="text-right">Balance</TableHead>}
            <TableHead className="text-right">Total</TableHead>
            {detailed && <TableHead className="w-28 pl-4">Due</TableHead>}
            <TableHead className="w-14 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow
              key={invoice.id}
              className="cursor-pointer"
              onClick={() => openPreview(invoice.id)}
            >
              <TableCell className="font-medium">{invoice.number}</TableCell>
              <TableCell>
                <Badge variant={invoiceStatusVariant(invoice.status)}>
                  {invoiceStatusLabel(invoice.status)}
                </Badge>
              </TableCell>
              {detailed && (
                <TableCell className="text-right tabular-nums">
                  {formatMoney(invoice.balanceDue ?? 0, invoice.currency)}
                </TableCell>
              )}
              <TableCell className="text-right tabular-nums">
                {formatMoney(invoice.total, invoice.currency)}
              </TableCell>
              {detailed && (
                <TableCell className="w-28 pl-4 text-muted-foreground">
                  {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                </TableCell>
              )}
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loadingId === invoice.id}
                    aria-label="Invoice actions"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontalIcon className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44 w-48">
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        openPreview(invoice.id);
                      }}
                    >
                      <EyeIcon className="size-4" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      render={<Link href={`/invoices/${invoice.id}`} />}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ExternalLinkIcon className="size-4" />
                      View details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      render={<Link href={`/invoices/${invoice.id}/edit`} />}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <PencilIcon className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDownload(invoice);
                      }}
                    >
                      <DownloadIcon className="size-4" />
                      Download PDF
                    </DropdownMenuItem>
                    {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          setSendInvoice(invoice);
                        }}
                      >
                        <SendIcon className="size-4" />
                        Send invoice
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(invoice);
                      }}
                    >
                      <Trash2Icon className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <InvoicePreviewSheet
        invoiceId={previewId}
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewId(null);
        }}
        clientEmail={clientEmail}
      />

      {sendInvoice && (
        <InvoiceSendDialog
          open={Boolean(sendInvoice)}
          onOpenChange={(open) => {
            if (!open) setSendInvoice(null);
          }}
          invoiceId={sendInvoice.id}
          invoiceNumber={sendInvoice.number}
          status={sendInvoice.status}
          clientEmail={clientEmail}
        />
      )}

      {pdfDownloadDialog}
    </>
  );
}
