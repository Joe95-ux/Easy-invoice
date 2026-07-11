"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, useEffect } from "react";
import {
  ClockIcon,
  ClipboardListIcon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  InfoIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/forms/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { TablePagination } from "@/components/data-table/table-pagination";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { LogTimeDialog } from "@/features/time/components/log-time-dialog";
import { ImportTimeDialog } from "@/features/time/components/import-time-dialog";
import { useTimeTimer } from "@/features/time/components/time-timer-provider";
import { useListTable } from "@/hooks/use-list-table";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ClientListItem } from "@/lib/clients";
import { formatDate, formatMoney } from "@/lib/invoices";
import { formatDuration } from "@/lib/time-tracking/format";
import { invoiceFromTimeUrl } from "@/lib/time-tracking/invoice-from-time";
import { estimateFromTimeUrl } from "@/lib/time-tracking/estimate-from-time";
import { cn } from "@/lib/utils";

export type SerializedTimeEntry = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  memberId: string | null;
  memberName: string | null;
  description: string;
  date: string;
  durationMinutes: number;
  hours: number;
  hourlyRate: number;
  billable: boolean;
  invoicedAt: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
};

function isInvoiceable(entry: SerializedTimeEntry) {
  return !entry.invoicedAt && entry.billable && Boolean(entry.clientId);
}

function entryHasActions(entry: SerializedTimeEntry) {
  const isBilled = Boolean(entry.invoicedAt);
  return isInvoiceable(entry) || !isBilled || Boolean(entry.invoiceId);
}

function TimeEntryActions({
  entry,
  isInvoicing,
  onInvoice,
  onEstimate,
  onEdit,
  onDelete,
}: {
  entry: SerializedTimeEntry;
  isInvoicing: boolean;
  onInvoice: () => void;
  onEstimate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isBilled = Boolean(entry.invoicedAt);
  const canInvoice = isInvoiceable(entry);

  if (!entryHasActions(entry)) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isInvoicing}
        aria-label="Time entry actions"
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 w-48">
        {canInvoice && (
          <>
            <DropdownMenuItem onClick={onInvoice} disabled={isInvoicing}>
              <FileTextIcon className="size-4" />
              Create invoice
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEstimate} disabled={isInvoicing}>
              <ClipboardListIcon className="size-4" />
              Create estimate
            </DropdownMenuItem>
          </>
        )}
        {isBilled && entry.invoiceId && (
          <DropdownMenuItem render={<Link href={`/invoices/${entry.invoiceId}`} />}>
            <EyeIcon className="size-4" />
            View invoice
          </DropdownMenuItem>
        )}
        {!isBilled && (
          <>
            {canInvoice && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={onEdit}>
              <PencilIcon className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon className="size-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type TimePageContentProps = {
  entries: SerializedTimeEntry[];
  clients: ClientListItem[];
  currency: string;
  defaultHourlyRate: number | null;
  recentDescriptions?: string[];
};

export function TimePageContent({
  entries: initialEntries,
  clients,
  currency,
  defaultHourlyRate,
  recentDescriptions = [],
}: TimePageContentProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { openStartTimer, timer, toggleActiveTimer } = useTimeTimer();
  const [isInvoicing, startInvoicing] = useTransition();
  const invoicingToastRef = useRef<string | number | null>(null);
  const [filter, setFilter] = useState<"all" | "unbilled">("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [logOpen, setLogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SerializedTimeEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<SerializedTimeEntry | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const entries = useMemo(() => {
    let result = initialEntries;

    if (filter === "unbilled") {
      result = result.filter((entry) => !entry.invoicedAt && entry.billable);
    }

    if (clientFilter !== "all") {
      result = result.filter((entry) => entry.clientId === clientFilter);
    }

    if (dateFrom) {
      result = result.filter((entry) => entry.date.slice(0, 10) >= dateFrom);
    }

    if (dateTo) {
      result = result.filter((entry) => entry.date.slice(0, 10) <= dateTo);
    }

    return result;
  }, [filter, initialEntries, clientFilter, dateFrom, dateTo]);

  const hasTableFilters = clientFilter !== "all" || Boolean(dateFrom) || Boolean(dateTo);

  const table = useListTable<SerializedTimeEntry>({
    tableId: "time",
    data: entries,
    searchKeys: ["clientName", "memberName", "description", "invoiceNumber"],
    defaultSortKey: "date",
    defaultSortDirection: "desc",
    getSortValue: (row, key) => {
      if (key === "durationMinutes") return row.durationMinutes;
      if (key === "hourlyRate") return row.hourlyRate;
      if (key === "amount") return row.hours * row.hourlyRate;
      return row[key as keyof SerializedTimeEntry];
    },
  });

  const invoiceableEntries = useMemo(
    () => entries.filter(isInvoiceable),
    [entries],
  );

  const showSelectionColumn = invoiceableEntries.length > 0;
  const showActionsColumn = useMemo(
    () => entries.some(entryHasActions),
    [entries],
  );
  const columnCount = 8 + (showSelectionColumn ? 1 : 0) + (showActionsColumn ? 1 : 0);

  const unbilledHours = initialEntries
    .filter((entry) => !entry.invoicedAt && entry.billable)
    .reduce((sum, entry) => sum + entry.hours, 0);

  const selectedEntries = useMemo(
    () => invoiceableEntries.filter((entry) => selectedIds.has(entry.id)),
    [invoiceableEntries, selectedIds],
  );

  const selectedClientIds = useMemo(
    () => new Set(selectedEntries.map((entry) => entry.clientId)),
    [selectedEntries],
  );

  const allInvoiceableSelected =
    invoiceableEntries.length > 0 &&
    invoiceableEntries.every((entry) => selectedIds.has(entry.id));

  useEffect(() => {
    if (isInvoicing) {
      if (!invoicingToastRef.current) {
        invoicingToastRef.current = toast.loading("Opening invoice…");
      }
      return;
    }

    if (invoicingToastRef.current) {
      toast.dismiss(invoicingToastRef.current);
      invoicingToastRef.current = null;
    }
  }, [isInvoicing]);

  function handleInvoiceFromTime(clientId: string, timeEntryIds: string[]) {
    if (isInvoicing) return;

    startInvoicing(() => {
      router.push(invoiceFromTimeUrl({ clientId, timeEntryIds }));
    });
  }

  function handleEstimateFromTime(clientId: string, timeEntryIds: string[]) {
    if (isInvoicing) return;

    startInvoicing(() => {
      router.push(estimateFromTimeUrl({ clientId, timeEntryIds }));
    });
  }

  function toggleEntry(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(
      checked ? new Set(invoiceableEntries.map((entry) => entry.id)) : new Set(),
    );
  }

  async function deleteEntries(ids: string[]) {
    setDeleting(true);
    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          const response = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Failed to delete");
        }),
      );
      void results;

      toast.success(
        ids.length === 1 ? "Time entry deleted" : `${ids.length} time entries deleted`,
      );
      setDeleteEntry(null);
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete time entries");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDelete() {
    if (!deleteEntry) return;
    await deleteEntries([deleteEntry.id]);
  }

  function handleBulkInvoice() {
    if (selectedClientIds.size !== 1 || isInvoicing) return;
    const clientId = selectedEntries[0]?.clientId;
    if (!clientId) return;

    handleInvoiceFromTime(
      clientId,
      selectedEntries.map((entry) => entry.id),
    );
  }

  function handleBulkEstimate() {
    if (selectedClientIds.size !== 1 || isInvoicing) return;
    const clientId = selectedEntries[0]?.clientId;
    if (!clientId) return;

    handleEstimateFromTime(
      clientId,
      selectedEntries.map((entry) => entry.id),
    );
  }

  return (
    <>
      <PageHeader
        title="Time"
        description="Log billable hours and turn them into invoice line items."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              onClick={() => setImportOpen(true)}
            >
              <DownloadIcon className="size-4" />
              Import
            </Button>
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              onClick={timer ? toggleActiveTimer : openStartTimer}
            >
              {timer ? (
                <ClockIcon className="size-4" />
              ) : (
                <PlayIcon className="size-4" />
              )}
              {timer ? "View timer" : "Start timer"}
            </Button>
            <Button
              className={pageHeaderActionClass}
              onClick={() => {
                setEditingEntry(null);
                setLogOpen(true);
              }}
            >
              <PlusIcon className="size-4" />
              Log time
            </Button>
          </div>
        }
      />

      {initialEntries.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={filter}
              onValueChange={(value) => {
                setFilter(value as "all" | "unbilled");
                setSelectedIds(new Set());
              }}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unbilled">Unbilled</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-sm text-muted-foreground">
              {unbilledHours.toFixed(2)} unbilled hours ready to invoice
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {clients.length > 0 && (
              <div className="w-full min-w-[10rem] sm:w-48">
                <label htmlFor="time-client-filter" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Client
                </label>
                <Select
                  value={clientFilter}
                  onValueChange={(value) => {
                    if (!value) return;
                    setClientFilter(value);
                    setSelectedIds(new Set());
                  }}
                  items={[
                    { value: "all", label: "All clients" },
                    ...clients.map((client) => ({ value: client.id, label: client.name })),
                  ]}
                >
                  <SelectTrigger id="time-client-filter" size="sm" className="w-full">
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="w-full min-w-[10rem] sm:w-40">
              <label htmlFor="time-date-from" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                From
              </label>
              <DatePicker
                id="time-date-from"
                value={dateFrom}
                onChange={(value) => {
                  setDateFrom(value);
                  setSelectedIds(new Set());
                }}
                placeholder="Start date"
              />
            </div>
            <div className="w-full min-w-[10rem] sm:w-40">
              <label htmlFor="time-date-to" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                To
              </label>
              <DatePicker
                id="time-date-to"
                value={dateTo}
                onChange={(value) => {
                  setDateTo(value);
                  setSelectedIds(new Set());
                }}
                placeholder="End date"
              />
            </div>
            {hasTableFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => {
                  setClientFilter("all");
                  setDateFrom("");
                  setDateTo("");
                  setSelectedIds(new Set());
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      )}

      {selectedEntries.length > 0 && (
        <div className="mb-4">
          {!isMobile && selectedClientIds.size > 1 && (
            <div className="mb-2 inline-flex w-fit max-w-md items-start gap-2 rounded-lg border border-warning/50 bg-muted/60 px-3 py-2 text-sm text-foreground shadow-sm">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-warning" />
              <p>Select entries for one client to invoice together.</p>
            </div>
          )}

          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              isMobile && "rounded-lg border bg-muted/40 px-3 py-2",
            )}
          >
            <p className="text-sm font-medium">{selectedEntries.length} selected</p>
            <Button
              size="sm"
              onClick={handleBulkInvoice}
              disabled={selectedClientIds.size !== 1 || isInvoicing}
            >
              {isInvoicing ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <FileTextIcon className="size-4" />
              )}
              {isInvoicing ? "Creating invoice..." : "Create invoice"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkEstimate}
              disabled={selectedClientIds.size !== 1 || isInvoicing}
            >
              {isInvoicing ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <ClipboardListIcon className="size-4" />
              )}
              {isInvoicing ? "Creating estimate..." : "Create estimate"}
            </Button>
            {isMobile && selectedClientIds.size > 1 && (
              <p className="flex w-full items-start gap-1.5 text-xs text-muted-foreground">
                <InfoIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
                Select entries for one client to invoice together.
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2Icon className="size-4" />
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState
          icon={ClockIcon}
          title={filter === "unbilled" ? "No unbilled time" : "No time logged yet"}
          description={
            filter === "unbilled"
              ? "All logged hours have been invoiced or marked non-billable."
              : "Track hours here, then add them to invoices in one click."
          }
          action={
            filter === "all" ? (
              <Button
                onClick={() => {
                  setEditingEntry(null);
                  setLogOpen(true);
                }}
              >
                <PlusIcon className="size-4" />
                Log your first entry
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <TableToolbar
            search={table.searchQuery}
            onSearchChange={table.setSearchQuery}
            searchPlaceholder="Search time entries..."
          />

          <Table
            stickyColumns={showSelectionColumn ? 2 : 1}
            stickyColumnWidths={
              showSelectionColumn ? ["3.25rem", "6.5rem"] : ["6.5rem"]
            }
          >
            <TableHeader>
              <TableRow>
                {showSelectionColumn && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allInvoiceableSelected}
                      onCheckedChange={(checked) => toggleAll(checked === true)}
                      aria-label="Select all invoiceable entries"
                    />
                  </TableHead>
                )}
                <SortableTableHead
                  label="Date"
                  column="date"
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
                  className="min-w-[8rem]"
                />
                <SortableTableHead
                  label="Logged by"
                  column="memberName"
                  sortKey={table.sortKey}
                  sortDirection={table.sortDirection}
                  onSort={table.toggleSort}
                  className="min-w-[7rem]"
                />
                <SortableTableHead
                  label="Description"
                  column="description"
                  sortKey={table.sortKey}
                  sortDirection={table.sortDirection}
                  onSort={table.toggleSort}
                  className="min-w-[10rem]"
                />
                <SortableTableHead
                  label="Duration"
                  column="durationMinutes"
                  sortKey={table.sortKey}
                  sortDirection={table.sortDirection}
                  onSort={table.toggleSort}
                  className="min-w-[5.5rem] pl-4 text-right [&_button]:ml-auto"
                />
                <SortableTableHead
                  label="Rate"
                  column="hourlyRate"
                  sortKey={table.sortKey}
                  sortDirection={table.sortDirection}
                  onSort={table.toggleSort}
                  className="min-w-[5.5rem] pl-4 text-right [&_button]:ml-auto"
                />
                <SortableTableHead
                  label="Amount"
                  column="amount"
                  sortKey={table.sortKey}
                  sortDirection={table.sortDirection}
                  onSort={table.toggleSort}
                  className="min-w-[5.5rem] pl-4 text-right [&_button]:ml-auto"
                />
                <TableHead className="min-w-[7rem] pl-4">Status</TableHead>
                {showActionsColumn && (
                  <TableHead className="w-14 pl-4 text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                    {table.hasActiveFilters
                      ? "No time entries match your search."
                      : "No time entries."}
                  </TableCell>
                </TableRow>
              ) : (
                table.pageRows.map((entry) => {
                const amount = entry.hours * entry.hourlyRate;
                const isBilled = Boolean(entry.invoicedAt);
                const canInvoice = isInvoiceable(entry);

                return (
                  <TableRow key={entry.id} data-state={selectedIds.has(entry.id) ? "selected" : undefined}>
                    {showSelectionColumn && (
                      <TableCell>
                        {canInvoice && (
                          <Checkbox
                            checked={selectedIds.has(entry.id)}
                            onCheckedChange={(checked) => toggleEntry(entry.id, checked === true)}
                            aria-label={`Select ${entry.description}`}
                          />
                        )}
                      </TableCell>
                    )}
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>{entry.clientName ?? "—"}</TableCell>
                    <TableCell>{entry.memberName ?? "—"}</TableCell>
                    <TableCell className="max-w-[16rem] truncate">{entry.description}</TableCell>
                    <TableCell className="pl-4 text-right tabular-nums">
                      {formatDuration(entry.durationMinutes)}
                    </TableCell>
                    <TableCell className="pl-4 text-right tabular-nums">
                      {formatMoney(entry.hourlyRate, currency)}
                    </TableCell>
                    <TableCell className="pl-4 text-right tabular-nums">
                      {formatMoney(amount, currency)}
                    </TableCell>
                    <TableCell className="pl-4">
                      {isBilled ? (
                        entry.invoiceId ? (
                          <Link
                            href={`/invoices/${entry.invoiceId}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {entry.invoiceNumber}
                          </Link>
                        ) : (
                          <Badge variant="secondary">Billed</Badge>
                        )
                      ) : entry.billable ? (
                        <Badge variant="outline">Unbilled</Badge>
                      ) : (
                        <Badge variant="secondary">Non-billable</Badge>
                      )}
                    </TableCell>
                    {showActionsColumn && (
                      <TableCell className="pl-4 text-right">
                        <TimeEntryActions
                          entry={entry}
                          isInvoicing={isInvoicing}
                          onInvoice={() => handleInvoiceFromTime(entry.clientId!, [entry.id])}
                          onEstimate={() => handleEstimateFromTime(entry.clientId!, [entry.id])}
                          onEdit={() => {
                            setEditingEntry(entry);
                            setLogOpen(true);
                          }}
                          onDelete={() => setDeleteEntry(entry)}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
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
        </Card>
      )}

      <LogTimeDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        clients={clients}
        defaultHourlyRate={defaultHourlyRate}
        entry={editingEntry}
        recentDescriptions={recentDescriptions}
      />

      <ImportTimeDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        clients={clients}
        defaultHourlyRate={defaultHourlyRate}
      />

      <AlertDialog open={Boolean(deleteEntry)} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete time entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the logged time for &ldquo;{deleteEntry?.description}&rdquo;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedEntries.length} time entries?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Only unbilled entries were selected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void deleteEntries(selectedEntries.map((entry) => entry.id))}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
