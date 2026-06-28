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
import { downloadInvoicePdf } from "@/lib/invoice-pdf-client";
import {
  formatMoney,
  invoiceStatusLabel,
  invoiceStatusVariant,
} from "@/lib/invoices";
import type { InvoiceStatus } from "@easy-invoice/db";

export type ClientInvoiceRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
};

type ClientInvoicesTableProps = {
  invoices: ClientInvoiceRow[];
  clientEmail?: string | null;
};

export function ClientInvoicesTable({ invoices, clientEmail }: ClientInvoicesTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendInvoice, setSendInvoice] = useState<ClientInvoiceRow | null>(null);

  function openPreview(invoiceId: string) {
    setPreviewId(invoiceId);
    setPreviewOpen(true);
  }

  async function handleDownload(invoice: ClientInvoiceRow) {
    setLoadingId(invoice.id);
    try {
      await downloadInvoicePdf(invoice.id, invoice.number);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not generate PDF");
    } finally {
      setLoadingId(null);
    }
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
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
              <TableCell className="text-right tabular-nums">
                {formatMoney(invoice.total, invoice.currency)}
              </TableCell>
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
    </>
  );
}
