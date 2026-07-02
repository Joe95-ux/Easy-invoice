"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  DownloadIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { TablePagination } from "@/components/data-table/table-pagination";
import { TableToolbar } from "@/components/data-table/table-toolbar";
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
import { useListTable } from "@/hooks/use-list-table";
import { usePdfDownload } from "@/hooks/use-pdf-download";
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

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...(
    ["DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE", "CANCELLED"] as InvoiceStatus[]
  ).map((status) => ({
    value: status,
    label: invoiceStatusLabel(status),
  })),
];

type InvoicesTableProps = {
  invoices: InvoiceRow[];
  companyName: string;
};

export function InvoicesTable({ invoices, companyName }: InvoicesTableProps) {
  const router = useRouter();
  const { openPdfDownload, pdfDownloadDialog } = usePdfDownload();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const table = useListTable<InvoiceRow>({
    tableId: "invoices",
    data: invoices,
    searchKeys: ["number", "clientName"],
    filterOptions: STATUS_FILTER_OPTIONS,
    defaultFilter: "all",
    filterFn: (row, filter) => filter === "all" || row.status === filter,
    defaultSortKey: "dueDate",
    defaultSortDirection: "desc",
    getSortValue: (row, key) => {
      if (key === "total") return Number(row.total);
      if (key === "number") return row.number;
      if (key === "clientName") return row.clientName ?? "";
      if (key === "status") return row.status;
      if (key === "dueDate") return row.dueDate ?? "";
      return null;
    },
  });

  function handleDownload(invoice: InvoiceRow) {
    openPdfDownload({
      kind: "invoice",
      documentId: invoice.id,
      documentNumber: invoice.number,
      companyName,
    });
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
    <div>
      <TableToolbar
        search={table.searchQuery}
        onSearchChange={table.setSearchQuery}
        searchPlaceholder="Search invoices..."
        filter={table.filter}
        onFilterChange={table.setFilter}
        filterOptions={table.filterOptions}
        filterLabel="Status"
      />

      <Table stickyColumnWidths={["5.5rem", "10rem"]}>
        <TableHeader>
          <TableRow>
            <SortableTableHead
              label="Number"
              column="number"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
            />
            <SortableTableHead
              label="Client"
              column="clientName"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
            />
            <SortableTableHead
              label="Status"
              column="status"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
            />
            <SortableTableHead
              label="Total"
              column="total"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
              className="w-36 text-right [&_button]:ml-auto"
            />
            <SortableTableHead
              label="Due"
              column="dueDate"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
              className="w-40 pl-6"
            />
            <TableHead className="w-14 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.pageRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {table.hasActiveFilters ? "No invoices match your filters." : "No invoices."}
              </TableCell>
            </TableRow>
          ) : (
            table.pageRows.map((invoice) => (
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
                      <DropdownMenuItem render={<Link href={`/invoices/${invoice.id}/edit`} />}>
                        <PencilIcon className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(invoice)}>
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
            ))
          )}
        </TableBody>
      </Table>

      <TablePagination
        page={table.page}
        pageCount={table.pageCount}
        pageSize={table.pageSize}
        pageSizeOptions={table.pageSizeOptions}
        totalCount={table.totalCount}
        rangeStart={table.rangeStart}
        rangeEnd={table.rangeEnd}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
      />
      {pdfDownloadDialog}
    </div>
  );
}
