"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
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
import { downloadCreditNotesCsv } from "@/features/credit-notes/lib/export-credit-notes-csv";
import { useListTable } from "@/hooks/use-list-table";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import { throwIfApiError, toastApiError } from "@/lib/billing/plan-api-error";
import {
  creditNoteKindLabel,
  creditNoteStatusLabel,
  creditNoteStatusVariant,
  formatCreditNoteDate,
  formatCreditNoteMoney,
  type CreditNoteListRow,
} from "@/lib/credit-note-display";
import type { CreditNoteStatus } from "@easy-invoice/db";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...(
    ["DRAFT", "ISSUED", "CANCELLED"] as CreditNoteStatus[]
  ).map((status) => ({
    value: status,
    label: creditNoteStatusLabel(status),
  })),
];

function CreditNoteRowMenu({
  note,
  canWrite,
  canDelete,
  disabled,
  onDownload,
  onDelete,
}: {
  note: CreditNoteListRow;
  canWrite: boolean;
  canDelete: boolean;
  disabled: boolean;
  onDownload: (note: CreditNoteListRow) => void;
  onDelete: (note: CreditNoteListRow) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        aria-label="Credit note actions"
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 w-48">
        <DropdownMenuItem render={<Link href={`/credit-notes/${note.id}`} />}>
          <EyeIcon className="size-4" />
          View
        </DropdownMenuItem>
        {canWrite && note.status === "DRAFT" ? (
          <DropdownMenuItem render={<Link href={`/credit-notes/${note.id}/edit`} />}>
            <PencilIcon className="size-4" />
            Edit
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => onDownload(note)}>
          <DownloadIcon className="size-4" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={`/invoices/${note.invoiceId}`} />}>
          <FileTextIcon className="size-4" />
          View invoice
        </DropdownMenuItem>
        {canDelete && note.status !== "CANCELLED" ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(note)}>
              <Trash2Icon className="size-4" />
              {note.status === "DRAFT" ? "Delete" : "Cancel credit note"}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type CreditNotesTableProps = {
  notes: CreditNoteListRow[];
  companyName: string;
  canWrite?: boolean;
  canDelete?: boolean;
};

export function CreditNotesTable({
  notes,
  companyName,
  canWrite = true,
  canDelete = true,
}: CreditNotesTableProps) {
  const router = useRouter();
  const { openPdfDownload, pdfDownloadDialog } = usePdfDownload();
  const [items, setItems] = useState(notes);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CreditNoteListRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setItems(notes);
  }, [notes]);

  const table = useListTable<CreditNoteListRow>({
    tableId: "credit-notes",
    data: items,
    searchKeys: ["number", "clientName", "invoiceNumber", "kind", "status"],
    filterOptions: STATUS_FILTER_OPTIONS,
    defaultFilter: "all",
    filterFn: (row, filter) => filter === "all" || row.status === filter,
    defaultSortKey: "issueDate",
    defaultSortDirection: "desc",
    getSortValue: (row, key) => {
      if (key === "total") return Number(row.total);
      if (key === "number") return row.number;
      if (key === "clientName") return row.clientName ?? "";
      if (key === "invoiceNumber") return row.invoiceNumber;
      if (key === "status") return row.status;
      if (key === "kind") return row.kind;
      if (key === "issueDate") return row.issueDate;
      return null;
    },
  });

  function handleDownload(note: CreditNoteListRow) {
    openPdfDownload({
      kind: "credit_note",
      documentId: note.id,
      documentNumber: note.number,
      companyName,
    });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    setDeleting(true);
    setLoadingId(pendingDelete.id);
    try {
      const response = await fetch(`/api/credit-notes/${pendingDelete.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      throwIfApiError(response, data, "Could not remove credit note");
      const removedId = pendingDelete.id;
      const wasDraft = pendingDelete.status === "DRAFT";
      setItems((prev) =>
        wasDraft
          ? prev.filter((note) => note.id !== removedId)
          : prev.map((note) =>
              note.id === removedId ? { ...note, status: "CANCELLED" as const } : note,
            ),
      );
      toast.success(wasDraft ? "Draft deleted" : "Credit note cancelled");
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toastApiError(error, "Could not remove credit note");
    } finally {
      setDeleting(false);
      setLoadingId(null);
    }
  }

  return (
    <div>
      <TableToolbar
        search={table.searchQuery}
        onSearchChange={table.setSearchQuery}
        searchPlaceholder="Search credit notes..."
        filter={table.filter}
        onFilterChange={table.setFilter}
        filterOptions={table.filterOptions}
        filterLabel="Status"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={table.totalCount === 0}
            onClick={() => downloadCreditNotesCsv(table.rows)}
          >
            <DownloadIcon className="size-4" />
            Export
          </Button>
        }
      />

      <div className="divide-y divide-border md:hidden">
        {table.pageRows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {table.hasActiveFilters ? "No credit notes match your filters." : "No credit notes."}
          </p>
        ) : (
          table.pageRows.map((note) => (
            <div key={note.id} className="flex items-start gap-3 px-4 py-3">
              <Link href={`/credit-notes/${note.id}`} className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{note.number}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {note.clientName ?? "No client"} · {note.invoiceNumber}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCreditNoteMoney(note.total, note.currency)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={creditNoteStatusVariant(note.status)}>
                    {creditNoteStatusLabel(note.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {creditNoteKindLabel(note.kind)} · {formatCreditNoteDate(note.issueDate)}
                  </span>
                </div>
              </Link>
              <CreditNoteRowMenu
                note={note}
                canWrite={canWrite}
                canDelete={canDelete}
                disabled={loadingId === note.id}
                onDownload={handleDownload}
                onDelete={setPendingDelete}
              />
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block">
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
                label="Invoice"
                column="invoiceNumber"
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
                label="Date"
                column="issueDate"
                sortKey={table.sortKey}
                sortDirection={table.sortDirection}
                onSort={table.toggleSort}
                className="w-36"
              />
              <SortableTableHead
                label="Kind"
                column="kind"
                sortKey={table.sortKey}
                sortDirection={table.sortDirection}
                onSort={table.toggleSort}
                className="w-24"
              />
              <SortableTableHead
                label="Status"
                column="status"
                sortKey={table.sortKey}
                sortDirection={table.sortDirection}
                onSort={table.toggleSort}
              />
              <SortableTableHead
                label="Amount"
                column="total"
                sortKey={table.sortKey}
                sortDirection={table.sortDirection}
                onSort={table.toggleSort}
                className="w-36 text-right [&_button]:ml-auto"
              />
              <TableHead className="w-14 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {table.hasActiveFilters
                    ? "No credit notes match your filters."
                    : "No credit notes."}
                </TableCell>
              </TableRow>
            ) : (
              table.pageRows.map((note) => (
                <TableRow key={note.id}>
                  <TableCell>
                    <Link
                      href={`/credit-notes/${note.id}`}
                      className="font-medium hover:underline"
                    >
                      {note.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/invoices/${note.invoiceId}`} className="hover:underline">
                      {note.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{note.clientName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCreditNoteDate(note.issueDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {creditNoteKindLabel(note.kind)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={creditNoteStatusVariant(note.status)}>
                      {creditNoteStatusLabel(note.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCreditNoteMoney(note.total, note.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <CreditNoteRowMenu
                      note={note}
                      canWrite={canWrite}
                      canDelete={canDelete}
                      disabled={loadingId === note.id}
                      onDownload={handleDownload}
                      onDelete={setPendingDelete}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
        title={pendingDelete?.status === "DRAFT" ? "Delete this draft?" : "Cancel this credit note?"}
        description={
          pendingDelete?.status === "DRAFT" ? (
            <>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {pendingDelete.number}
              </span>
              .
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">
                {pendingDelete?.number ?? "This credit note"}
              </span>{" "}
              will no longer change the invoice balance.
            </>
          )
        }
        confirmLabel={pendingDelete?.status === "DRAFT" ? "Delete" : "Cancel credit note"}
        confirmingLabel={pendingDelete?.status === "DRAFT" ? "Deleting..." : "Cancelling..."}
        confirming={deleting}
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
