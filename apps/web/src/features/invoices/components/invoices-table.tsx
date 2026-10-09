"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { throwIfApiError, toastApiError, isPlanApiError } from "@/lib/billing/plan-api-error";
import { useCompanyPlan } from "@/components/billing/company-plan-context";
import {
  BanknoteIcon,
  BellRingIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { MakeRecurringDialog } from "@/features/recurring-invoices/components/make-recurring-dialog";
import { RecordPaymentDialog } from "@/features/invoices/components/record-payment-dialog";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import {
  formatDate,
  formatMoney,
  invoiceStatusLabel,
  invoiceStatusVariant,
} from "@/lib/invoices";
import { downloadInvoicePdfQuiet } from "@/lib/invoice-pdf-client";
import {
  INVOICE_LIST_PAGE_SIZES,
  type InvoiceListRow,
  type InvoiceListSortKey,
} from "@/lib/invoice-list-shared";
import type { InvoiceStatus } from "@easy-invoice/db";

export type InvoiceRow = InvoiceListRow;

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...(
    ["DRAFT", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"] as InvoiceStatus[]
  ).map((status) => ({
    value: status,
    label: invoiceStatusLabel(status),
  })),
];

const REMINDABLE_STATUSES: InvoiceStatus[] = [
  "SENT",
  "VIEWED",
  "OVERDUE",
  "PARTIALLY_PAID",
];

const MAX_BULK = 25;

type InvoicesTableProps = {
  initialRows: InvoiceRow[];
  initialTotalCount: number;
  initialPage: number;
  initialPageSize: number;
  initialPageCount: number;
  companyName: string;
  celebrateInvoicePaid?: boolean;
  canWrite?: boolean;
  canDelete?: boolean;
};

type ListResponse = {
  rows: InvoiceRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

function canRemindRow(row: InvoiceRow): boolean {
  return (
    Boolean(row.sentAt) &&
    Boolean(row.dueDate) &&
    Boolean(row.clientEmail?.trim()) &&
    REMINDABLE_STATUSES.includes(row.status)
  );
}

function canSendRow(row: InvoiceRow): boolean {
  return (
    Boolean(row.clientEmail?.trim()) &&
    row.status !== "CANCELLED" &&
    row.status !== "PAID"
  );
}

function canRecordPayment(row: InvoiceRow): boolean {
  return (
    row.status !== "DRAFT" &&
    row.status !== "CANCELLED" &&
    row.status !== "PAID" &&
    Number(row.balanceDue) > 0.001
  );
}

function InvoiceRowMenu({
  invoice,
  canWrite,
  canDelete,
  disabled,
  onDownload,
  onDuplicate,
  onRecordPayment,
  onMakeRecurring,
  onDelete,
}: {
  invoice: InvoiceRow;
  canWrite: boolean;
  canDelete: boolean;
  disabled: boolean;
  onDownload: (invoice: InvoiceRow) => void;
  onDuplicate: (invoice: InvoiceRow) => void;
  onRecordPayment: (invoice: InvoiceRow) => void;
  onMakeRecurring: (invoice: InvoiceRow) => void;
  onDelete: (invoice: InvoiceRow) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        aria-label="Invoice actions"
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 w-48">
        <DropdownMenuItem render={<Link href={`/invoices/${invoice.id}`} />}>
          <EyeIcon className="size-4" />
          View
        </DropdownMenuItem>
        {canWrite ? (
          <DropdownMenuItem render={<Link href={`/invoices/${invoice.id}/edit`} />}>
            <PencilIcon className="size-4" />
            Edit
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => onDownload(invoice)}>
          <DownloadIcon className="size-4" />
          Download PDF
        </DropdownMenuItem>
        {canWrite && canRecordPayment(invoice) ? (
          <DropdownMenuItem onClick={() => onRecordPayment(invoice)}>
            <BanknoteIcon className="size-4" />
            Record payment
          </DropdownMenuItem>
        ) : null}
        {canWrite ? (
          <DropdownMenuItem render={<Link href={`/invoices/${invoice.id}`} />}>
            <SendIcon className="size-4" />
            Send invoice
          </DropdownMenuItem>
        ) : null}
        {canWrite ? (
          <DropdownMenuItem onClick={() => onDuplicate(invoice)}>
            <CopyIcon className="size-4" />
            Duplicate
          </DropdownMenuItem>
        ) : null}
        {canWrite && invoice.clientId && invoice.status !== "CANCELLED" ? (
          <DropdownMenuItem onClick={() => onMakeRecurring(invoice)}>
            <RefreshCwIcon className="size-4" />
            Make recurring
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(invoice)}>
              <Trash2Icon className="size-4" />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InvoicesTable({
  initialRows,
  initialTotalCount,
  initialPage,
  initialPageSize,
  initialPageCount,
  companyName,
  celebrateInvoicePaid = false,
  canWrite = true,
  canDelete = true,
}: InvoicesTableProps) {
  const router = useRouter();
  const { isPro } = useCompanyPlan();
  const { openPdfDownload, pdfDownloadDialog } = usePdfDownload();
  const [rows, setRows] = useState(initialRows);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pageCount, setPageCount] = useState(initialPageCount);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortKey, setSortKey] = useState<InvoiceListSortKey>("dueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [makeRecurringInvoice, setMakeRecurringInvoice] = useState<InvoiceRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<InvoiceRow | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedById, setSelectedById] = useState<Map<string, InvoiceRow>>(
    () => new Map(),
  );
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);
  const skipFetchRef = useRef(true);
  const fetchSeq = useRef(0);
  const prevSearchRef = useRef(debouncedSearch);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const fetchList = useCallback(
    async (opts: {
      q: string;
      status: string;
      page: number;
      pageSize: number;
      sortKey: InvoiceListSortKey;
      sortDir: "asc" | "desc";
    }) => {
      const seq = ++fetchSeq.current;
      setLoadingList(true);
      try {
        const params = new URLSearchParams();
        if (opts.q) params.set("q", opts.q);
        params.set("status", opts.status);
        params.set("page", String(opts.page));
        params.set("pageSize", String(opts.pageSize));
        params.set("sortKey", opts.sortKey);
        params.set("sortDir", opts.sortDir);
        const res = await fetch(`/api/invoices?${params.toString()}`);
        const data = (await res.json().catch(() => ({}))) as ListResponse & {
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to load invoices");
        if (seq !== fetchSeq.current) return;
        setRows(data.rows);
        setTotalCount(data.totalCount);
        setPage(data.page);
        setPageSize(data.pageSize);
        setPageCount(data.pageCount);
      } catch (error) {
        if (seq !== fetchSeq.current) return;
        toast.error(error instanceof Error ? error.message : "Failed to load invoices");
      } finally {
        if (seq === fetchSeq.current) setLoadingList(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      prevSearchRef.current = debouncedSearch;
      return;
    }
    // Search changed while on page > 1: sync page first, let the next effect fetch.
    if (prevSearchRef.current !== debouncedSearch) {
      prevSearchRef.current = debouncedSearch;
      if (page !== 1) {
        setPage(1);
        return;
      }
    }
    void fetchList({
      q: debouncedSearch,
      status: filter,
      page,
      pageSize,
      sortKey,
      sortDir: sortDirection,
    });
  }, [debouncedSearch, filter, page, pageSize, sortKey, sortDirection, fetchList]);

  const selectedRows = useMemo(
    () => Array.from(selectedById.values()),
    [selectedById],
  );
  const selectedIds = useMemo(
    () => new Set(selectedById.keys()),
    [selectedById],
  );

  const pageIds = rows.map((row) => row.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  function toggleSort(column: string) {
    const key = column as InvoiceListSortKey;
    if (sortKey === key) {
      setSortDirection((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "number" || key === "clientName" ? "asc" : "desc");
    }
    setPage(1);
  }

  function toggleRow(row: InvoiceRow, checked: boolean) {
    setSelectedById((prev) => {
      const next = new Map(prev);
      if (checked) {
        if (next.size >= MAX_BULK && !next.has(row.id)) {
          toast.message(`Select up to ${MAX_BULK} invoices at a time`);
          return prev;
        }
        next.set(row.id, row);
      } else {
        next.delete(row.id);
      }
      return next;
    });
  }

  function togglePage(checked: boolean) {
    setSelectedById((prev) => {
      const next = new Map(prev);
      if (!checked) {
        for (const id of pageIds) next.delete(id);
        return next;
      }
      for (const row of rows) {
        if (next.size >= MAX_BULK && !next.has(row.id)) {
          toast.message(`Select up to ${MAX_BULK} invoices at a time`);
          break;
        }
        next.set(row.id, row);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedById(new Map());
  }

  function handleDownload(invoice: InvoiceRow) {
    openPdfDownload({
      kind: "invoice",
      documentId: invoice.id,
      documentNumber: invoice.number,
      companyName,
    });
  }

  async function handleDuplicate(invoice: InvoiceRow) {
    setLoadingId(invoice.id);
    const toastId = toast.loading("Duplicating invoice…");
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/duplicate`, {
        method: "POST",
      });
      const data = await response.json();
      throwIfApiError(response, data, "Failed to duplicate");

      toast.success(`Draft created from ${invoice.number}`, { id: toastId });
      router.push(`/invoices/${data.invoice.id}`);
      router.refresh();
    } catch (error) {
      toast.dismiss(toastId);
      toastApiError(error, "Could not duplicate invoice");
    } finally {
      setLoadingId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    setDeleting(true);
    setLoadingId(pendingDelete.id);
    try {
      const response = await fetch(`/api/invoices/${pendingDelete.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Invoice deleted");
      setPendingDelete(null);
      setSelectedById((prev) => {
        const next = new Map(prev);
        next.delete(pendingDelete.id);
        return next;
      });
      skipFetchRef.current = false;
      await fetchList({
        q: debouncedSearch,
        status: filter,
        page,
        pageSize,
        sortKey,
        sortDir: sortDirection,
      });
      router.refresh();
    } catch {
      toast.error("Could not delete invoice");
    } finally {
      setDeleting(false);
      setLoadingId(null);
    }
  }

  async function bulkSend() {
    if (!isPro) {
      toast.message("Email invoices so clients can pay faster — available on Pro", {
        action: {
          label: "Upgrade",
          onClick: () => router.push("/settings/billing/plans"),
        },
      });
      return;
    }
    const targets = selectedRows.filter(canSendRow);
    if (targets.length === 0) {
      toast.error("Selected invoices need a client email and cannot be paid/cancelled");
      return;
    }

    setBulkBusy("send");
    const toastId = toast.loading(`Sending ${targets.length} invoice${targets.length === 1 ? "" : "s"}…`);
    let ok = 0;
    let failed = 0;
    let planError: unknown = null;
    for (const invoice of targets) {
      try {
        const response = await fetch(`/api/invoices/${invoice.id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: invoice.clientEmail }),
        });
        const data = await response.json().catch(() => ({}));
        throwIfApiError(response, data, "Send failed");
        ok += 1;
      } catch (error) {
        if (!planError && isPlanApiError(error)) planError = error;
        failed += 1;
      }
    }
    if (planError) {
      toast.dismiss(toastId);
      toastApiError(planError, "Could not send invoices");
    } else if (failed === 0) {
      toast.success(`Sent ${ok} invoice${ok === 1 ? "" : "s"}`, { id: toastId });
    } else {
      toast.warning(`Sent ${ok}, failed ${failed}`, { id: toastId });
    }
    clearSelection();
    setBulkBusy(null);
    await fetchList({
      q: debouncedSearch,
      status: filter,
      page,
      pageSize,
      sortKey,
      sortDir: sortDirection,
    });
    router.refresh();
  }

  async function bulkRemind() {
    const targets = selectedRows.filter(canRemindRow);
    if (targets.length === 0) {
      toast.error("None of the selected invoices are ready for a reminder");
      return;
    }

    setBulkBusy("remind");
    const toastId = toast.loading(
      `Sending ${targets.length} reminder${targets.length === 1 ? "" : "s"}…`,
    );
    let ok = 0;
    let failed = 0;
    for (const invoice of targets) {
      try {
        const response = await fetch(`/api/invoices/${invoice.id}/remind`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: invoice.clientEmail }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Remind failed");
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    if (failed === 0) {
      toast.success(`Sent ${ok} reminder${ok === 1 ? "" : "s"}`, { id: toastId });
    } else {
      toast.warning(`Reminded ${ok}, failed ${failed}`, { id: toastId });
    }
    clearSelection();
    setBulkBusy(null);
    router.refresh();
  }

  async function bulkDownloadPdf() {
    const targets = selectedRows.slice(0, MAX_BULK);
    if (targets.length === 0) return;

    setBulkBusy("pdf");
    const toastId = toast.loading(
      `Downloading ${targets.length} PDF${targets.length === 1 ? "" : "s"}…`,
    );
    let ok = 0;
    let failed = 0;
    for (const invoice of targets) {
      try {
        await downloadInvoicePdfQuiet(invoice.id, invoice.number);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    if (failed === 0) {
      toast.success(`Downloaded ${ok} PDF${ok === 1 ? "" : "s"}`, { id: toastId });
    } else {
      toast.warning(`Downloaded ${ok}, failed ${failed}`, { id: toastId });
    }
    setBulkBusy(null);
  }

  const showSelection = canWrite;
  const colSpan = 6 + (showSelection ? 1 : 0);
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div>
      {selectedRows.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <p className="text-sm font-medium">
            {selectedRows.length} selected
            <span className="font-normal text-muted-foreground">
              {" "}
              (max {MAX_BULK})
            </span>
          </p>
          <Button
            size="sm"
            disabled={bulkBusy !== null}
            onClick={() => void bulkSend()}
          >
            {bulkBusy === "send" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
            Send
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkBusy !== null}
            onClick={() => void bulkRemind()}
          >
            {bulkBusy === "remind" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <BellRingIcon className="size-4" />
            )}
            Remind
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkBusy !== null}
            onClick={() => void bulkDownloadPdf()}
          >
            {bulkBusy === "pdf" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <DownloadIcon className="size-4" />
            )}
            Download PDFs
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={bulkBusy !== null}
            onClick={clearSelection}
            aria-label="Clear selection"
          >
            <XIcon className="size-4" />
            Clear
          </Button>
        </div>
      ) : null}

      <TableToolbar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search invoices..."
        filter={filter}
        onFilterChange={(value) => {
          setFilter(value);
          setPage(1);
        }}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterLabel="Status"
      />

      <div className="relative">
        {loadingList ? (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/40 pt-16">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        <div className="divide-y divide-border md:hidden">
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {debouncedSearch || filter !== "all"
                ? "No invoices match your filters."
                : "No invoices."}
            </p>
          ) : (
            rows.map((invoice) => (
              <div
                key={invoice.id}
                className={`flex items-start gap-3 px-4 py-3 ${
                  selectedIds.has(invoice.id) ? "bg-muted" : ""
                }`}
              >
                {showSelection ? (
                  <Checkbox
                    className="mt-1"
                    checked={selectedIds.has(invoice.id)}
                    onCheckedChange={(checked) => toggleRow(invoice, checked === true)}
                    aria-label={`Select ${invoice.number}`}
                    disabled={bulkBusy !== null}
                  />
                ) : null}
                <Link href={`/invoices/${invoice.id}`} className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{invoice.number}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {invoice.clientName ?? "No client"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatMoney(invoice.total, invoice.currency)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={invoiceStatusVariant(invoice.status)}>
                      {invoiceStatusLabel(invoice.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : "No due date"}
                    </span>
                    {Number(invoice.balanceDue) < Number(invoice.total) - 0.001 ? (
                      <span className="text-xs text-muted-foreground">
                        {formatMoney(invoice.balanceDue, invoice.currency)} due
                      </span>
                    ) : null}
                  </div>
                </Link>
                <InvoiceRowMenu
                  invoice={invoice}
                  canWrite={canWrite}
                  canDelete={canDelete}
                  disabled={loadingId === invoice.id || bulkBusy !== null}
                  onDownload={handleDownload}
                  onDuplicate={handleDuplicate}
                  onRecordPayment={setPaymentInvoice}
                  onMakeRecurring={setMakeRecurringInvoice}
                  onDelete={setPendingDelete}
                />
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block">
        <Table
          stickyColumns={showSelection ? 2 : 1}
          stickyColumnWidths={showSelection ? ["3rem", "5.5rem"] : ["5.5rem"]}
        >
          <TableHeader>
            <TableRow>
              {showSelection ? (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allPageSelected}
                    indeterminate={somePageSelected && !allPageSelected}
                    onCheckedChange={(checked) => togglePage(checked === true)}
                    aria-label="Select all on this page"
                    disabled={bulkBusy !== null}
                  />
                </TableHead>
              ) : null}
              <SortableTableHead
                label="Number"
                column="number"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
              <SortableTableHead
                label="Client"
                column="clientName"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
              <SortableTableHead
                label="Status"
                column="status"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
              />
              <SortableTableHead
                label="Total"
                column="total"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="w-36 text-right [&_button]:ml-auto"
              />
              <SortableTableHead
                label="Due"
                column="dueDate"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
                className="w-40 pl-6"
              />
              <TableHead className="w-14 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                  {debouncedSearch || filter !== "all"
                    ? "No invoices match your filters."
                    : "No invoices."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  data-state={selectedIds.has(invoice.id) ? "selected" : undefined}
                >
                  {showSelection ? (
                    <TableCell className="w-10">
                    <Checkbox
                      checked={selectedIds.has(invoice.id)}
                      onCheckedChange={(checked) =>
                        toggleRow(invoice, checked === true)
                      }
                      aria-label={`Select ${invoice.number}`}
                      disabled={bulkBusy !== null}
                      onClick={(event) => event.stopPropagation()}
                    />
                    </TableCell>
                  ) : null}
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
                    <div>{formatMoney(invoice.total, invoice.currency)}</div>
                    {Number(invoice.balanceDue) < Number(invoice.total) - 0.001 && (
                      <div className="text-xs text-muted-foreground">
                        {formatMoney(invoice.balanceDue, invoice.currency)} due
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-40 pl-6 text-muted-foreground">
                    {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <InvoiceRowMenu
                      invoice={invoice}
                      canWrite={canWrite}
                      canDelete={canDelete}
                      disabled={loadingId === invoice.id || bulkBusy !== null}
                      onDownload={handleDownload}
                      onDuplicate={handleDuplicate}
                      onRecordPayment={setPaymentInvoice}
                      onMakeRecurring={setMakeRecurringInvoice}
                      onDelete={setPendingDelete}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <TablePagination
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        pageSizeOptions={[...INVOICE_LIST_PAGE_SIZES]}
        totalCount={totalCount}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
      {pdfDownloadDialog}
      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
        title="Delete invoice?"
        description={
          <>
            This will permanently delete{" "}
            <span className="font-medium text-foreground">
              {pendingDelete?.number ?? "this invoice"}
            </span>
            . This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        confirming={deleting}
        destructive
        onConfirm={confirmDelete}
      />
      {paymentInvoice ? (
        <RecordPaymentDialog
          open={Boolean(paymentInvoice)}
          onOpenChange={(open) => {
            if (!open) setPaymentInvoice(null);
          }}
          invoiceId={paymentInvoice.id}
          invoiceNumber={paymentInvoice.number}
          status={paymentInvoice.status}
          currency={paymentInvoice.currency}
          balanceDue={Number(paymentInvoice.balanceDue)}
          celebrateInvoicePaid={celebrateInvoicePaid}
          onRecorded={() => {
            void fetchList({
              q: debouncedSearch,
              status: filter,
              page,
              pageSize,
              sortKey,
              sortDir: sortDirection,
            });
          }}
        />
      ) : null}
      <MakeRecurringDialog
        open={Boolean(makeRecurringInvoice)}
        onOpenChange={(open) => {
          if (!open) setMakeRecurringInvoice(null);
        }}
        invoiceId={makeRecurringInvoice?.id ?? ""}
        invoiceNumber={makeRecurringInvoice?.number ?? ""}
        clientName={makeRecurringInvoice?.clientName}
        clientEmail={makeRecurringInvoice?.clientEmail}
        onCreated={(recurringInvoiceId) => {
          setMakeRecurringInvoice(null);
          router.push(`/recurring-invoices?id=${recurringInvoiceId}`);
          router.refresh();
        }}
      />
    </div>
  );
}
