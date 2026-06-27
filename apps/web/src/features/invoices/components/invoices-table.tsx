"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  DownloadIcon,
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
import { downloadInvoicePdf } from "@/lib/invoice-pdf-client";
import {
  formatDate,
  formatMoney,
  invoiceStatusLabel,
  invoiceStatusVariant,
} from "@/lib/invoices";
import type { InvoiceStatus } from "@easy-invoice/db";

export type InvoiceRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  total: string;
  currency: string;
  dueDate: string | null;
  clientName: string | null;
};

type InvoicesTableProps = {
  invoices: InvoiceRow[];
};

export function InvoicesTable({ invoices }: InvoicesTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleDownload(invoice: InvoiceRow) {
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

  async function handleDelete(invoice: InvoiceRow) {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Number</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-36 text-right">Total</TableHead>
          <TableHead className="w-40 pl-6">Due</TableHead>
          <TableHead className="w-14 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell>
              <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                {invoice.number}
              </Link>
            </TableCell>
            <TableCell>{invoice.clientName ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={invoiceStatusVariant(invoice.status)}>
                {invoiceStatusLabel(invoice.status)}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(invoice.total, invoice.currency)}
            </TableCell>
            <TableCell className="w-40 pl-6 text-muted-foreground">
              {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loadingId === invoice.id}
                  aria-label="Invoice actions"
                >
                  <MoreHorizontalIcon className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44 w-48">
                  <DropdownMenuItem render={<Link href={`/invoices/${invoice.id}`} />}>
                    <EyeIcon className="size-4" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDownload(invoice)}
                  >
                    <DownloadIcon className="size-4" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href={`/invoices/${invoice.id}`} />}>
                    <SendIcon className="size-4" />
                    Send invoice
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleDelete(invoice)}
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
  );
}
