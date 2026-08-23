"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MoreHorizontalIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { throwIfApiError, toastApiError } from "@/lib/billing/plan-api-error";
import { useCompanyPlan } from "@/components/billing/company-plan-context";
import { ProFeatureGate } from "@/components/billing/pro-feature-gate";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { TablePagination } from "@/components/data-table/table-pagination";
import { TableToolbar } from "@/components/data-table/table-toolbar";
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
import {
  RecurringScheduleDrawer,
  type RecurringClientOption,
  type RecurringInvoiceOption,
} from "@/features/recurring-invoices/components/recurring-schedule-drawer";
import { useListTable } from "@/hooks/use-list-table";
import { formatMoney } from "@/lib/invoices";
import {
  frequencyLabel,
  recurringStatusLabel,
  recurringStatusVariant,
  type SerializedRecurringInvoice,
} from "@/lib/recurring-invoices-shared";
import { cn } from "@/lib/utils";
import type { RecurringInvoiceStatus } from "@easy-invoice/db";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ENDED", label: "Ended" },
];

type RecurringInvoicesPageContentProps = {
  initialRows: SerializedRecurringInvoice[];
  clients: RecurringClientOption[];
  invoices: RecurringInvoiceOption[];
  currency: string;
  /** Open this schedule’s edit drawer on load (`?id=`). */
  highlightId?: string | null;
};

function formatDateOnly(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function RecurringInvoicesPageContent({
  initialRows,
  clients,
  invoices,
  currency,
  highlightId = null,
}: RecurringInvoicesPageContentProps) {
  const router = useRouter();
  const { isPro } = useCompanyPlan();
  const [rows, setRows] = useState(initialRows);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedRecurringInvoice | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SerializedRecurringInvoice | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [highlightHandled, setHighlightHandled] = useState(false);

  const table = useListTable<SerializedRecurringInvoice>({
    tableId: "recurring-invoices",
    data: rows,
    searchKeys: ["name", "clientName"],
    filterOptions: STATUS_FILTER_OPTIONS,
    defaultFilter: "all",
    filterFn: (row, filter) => row.status === filter,
    defaultSortKey: "nextIssueDate",
    defaultSortDirection: "asc",
    getSortValue: (row, key) => {
      if (key === "client") return row.client.name;
      if (key === "estimatedTotal") return row.estimatedTotal;
      if (key === "occurrenceCount") return row.occurrenceCount;
      if (key === "name" || key === "status" || key === "nextIssueDate" || key === "frequency") {
        return row[key];
      }
      return row[key as keyof SerializedRecurringInvoice];
    },
  });

  const empty = rows.length === 0;

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    if (!isPro || highlightHandled || !highlightId) return;
    const match = rows.find((row) => row.id === highlightId);
    if (!match) return;
    setEditing(match);
    setDialogOpen(true);
    setHighlightHandled(true);
    router.replace("/recurring-invoices", { scroll: false });
  }, [highlightId, highlightHandled, rows, router, isPro]);

  function openCreate() {
    if (!isPro) return;
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(row: SerializedRecurringInvoice) {
    if (!isPro) return;
    setEditing(row);
    setDialogOpen(true);
  }

  function upsertRow(row: SerializedRecurringInvoice) {
    setRows((prev) => {
      const index = prev.findIndex((item) => item.id === row.id);
      if (index === -1) return [row, ...prev];
      const next = prev.slice();
      next[index] = row;
      return next;
    });
  }

  async function patchStatus(row: SerializedRecurringInvoice, status: RecurringInvoiceStatus) {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/recurring-invoices/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      throwIfApiError(res, data, "Could not update status");
      upsertRow(data.recurringInvoice as SerializedRecurringInvoice);
      toast.success(
        status === "ACTIVE"
          ? "Schedule resumed"
          : status === "PAUSED"
            ? "Schedule paused"
            : "Schedule ended",
      );
      router.refresh();
    } catch (error) {
      toastApiError(error, "Could not update status");
    } finally {
      setBusyId(null);
    }
  }

  async function generateNow(row: SerializedRecurringInvoice) {
    setBusyId(row.id);
    const toastId = toast.loading("Generating invoice…");
    try {
      const res = await fetch(`/api/recurring-invoices/${row.id}/generate`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      throwIfApiError(res, data, "Could not generate invoice");

      if (data.recurringInvoice) {
        upsertRow(data.recurringInvoice as SerializedRecurringInvoice);
      }

      const invoiceId = data.result?.invoiceId as string | undefined;
      const invoiceNumber = data.result?.invoiceNumber as string | undefined;
      if (invoiceId) {
        toast.success(invoiceNumber ? `Created ${invoiceNumber}` : "Invoice created", {
          id: toastId,
          action: {
            label: "Open",
            onClick: () => router.push(`/invoices/${invoiceId}`),
          },
        });
      } else {
        toast.success("Schedule updated", { id: toastId });
      }
      if (data.result?.error) {
        toast.warning(data.result.error as string);
      }
      router.refresh();
    } catch (error) {
      toast.dismiss(toastId);
      toastApiError(error, "Could not generate invoice");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setBusyId(pendingDelete.id);
    try {
      const res = await fetch(`/api/recurring-invoices/${pendingDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      throwIfApiError(res, data, "Could not delete schedule");
      setRows((prev) => prev.filter((row) => row.id !== pendingDelete.id));
      toast.success("Schedule deleted", {
        description: "Past invoices created from this schedule were kept.",
      });
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toastApiError(error, "Could not delete schedule");
    } finally {
      setDeleting(false);
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Recurring invoices"
        description="Automatically create invoices on a schedule for retainers and subscriptions."
        actions={
          isPro ? (
            <Button
              className={pageHeaderActionClass}
              onClick={openCreate}
              disabled={invoices.length === 0}
            >
              <PlusIcon />
              New schedule
            </Button>
          ) : (
            <Button
              className={pageHeaderActionClass}
              render={<Link href="/settings/billing/plans" />}
            >
              Upgrade to Pro
            </Button>
          )
        }
      />

      {!isPro ? (
        <ProFeatureGate
          variant="banner"
          className="mb-6"
          title="Recurring invoices are on Pro"
          description="Schedule automatic invoices for retainers and subscriptions. Free plans can still create one-off invoices."
        />
      ) : null}

      {empty ? (
        <EmptyState
          icon={RefreshCwIcon}
          title="No recurring schedules yet"
          description={
            !isPro
              ? "Upgrade to Pro to schedule invoices that create themselves on a cadence."
              : invoices.length === 0
                ? "Create an invoice first, then turn it into a recurring schedule—client, lines, and totals are copied automatically."
                : "Pick an existing invoice and set how often new ones should be created."
          }
          action={
            !isPro ? (
              <Button render={<Link href="/settings/billing/plans" />}>Upgrade to Pro</Button>
            ) : invoices.length > 0 ? (
              <Button onClick={openCreate}>
                <PlusIcon />
                New schedule
              </Button>
            ) : (
              <Button render={<Link href="/invoices/new" />}>New invoice</Button>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <div>
            <TableToolbar
              search={table.searchQuery}
              onSearchChange={table.setSearchQuery}
              searchPlaceholder="Search schedules…"
              filter={table.filter}
              onFilterChange={table.setFilter}
              filterOptions={STATUS_FILTER_OPTIONS}
              filterLabel="Status"
            />

            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label="Schedule"
                    column="name"
                    sortKey={table.sortKey}
                    sortDirection={table.sortDirection}
                    onSort={table.toggleSort}
                  />
                  <SortableTableHead
                    label="Client"
                    column="client"
                    sortKey={table.sortKey}
                    sortDirection={table.sortDirection}
                    onSort={table.toggleSort}
                    className="hidden sm:table-cell"
                  />
                  <SortableTableHead
                    label="Status"
                    column="status"
                    sortKey={table.sortKey}
                    sortDirection={table.sortDirection}
                    onSort={table.toggleSort}
                  />
                  <SortableTableHead
                    label="Cadence"
                    column="frequency"
                    sortKey={table.sortKey}
                    sortDirection={table.sortDirection}
                    onSort={table.toggleSort}
                    className="hidden md:table-cell"
                  />
                  <SortableTableHead
                    label="Next issue"
                    column="nextIssueDate"
                    sortKey={table.sortKey}
                    sortDirection={table.sortDirection}
                    onSort={table.toggleSort}
                  />
                  <SortableTableHead
                    label="Amount"
                    column="estimatedTotal"
                    sortKey={table.sortKey}
                    sortDirection={table.sortDirection}
                    onSort={table.toggleSort}
                    className="text-right [&_button]:ml-auto"
                  />
                  <TableHead className="w-14 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      {table.hasActiveFilters
                        ? "No schedules match your filters."
                        : "No schedules."}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.pageRows.map((row) => {
                    const busy = busyId === row.id;
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          busy && "opacity-60",
                          highlightId === row.id && "bg-muted/40",
                        )}
                      >
                        <TableCell>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="cursor-pointer truncate text-left font-medium hover:underline"
                            >
                              {row.name}
                            </button>
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {row.client.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.occurrenceCount} issued
                              {row.maxOccurrences != null ? ` / ${row.maxOccurrences}` : ""}
                              {row.autoSend ? " · Auto-send" : ""}
                            </p>
                            {row.lastError ? (
                              <p className="mt-0.5 truncate text-xs text-destructive">
                                {row.lastError}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Link
                            href={`/clients/${row.client.id}`}
                            className="hover:underline"
                          >
                            {row.client.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={recurringStatusVariant(row.status)}>
                            {recurringStatusLabel(row.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {frequencyLabel(row.frequency, row.interval)}
                        </TableCell>
                        <TableCell>
                          {row.status === "ENDED" ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            formatDateOnly(row.nextIssueDate)
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(row.estimatedTotal, row.currency || currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Actions for ${row.name}`}
                                  disabled={busy}
                                />
                              }
                            >
                              <MoreHorizontalIcon />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-44">
                              <DropdownMenuItem onClick={() => openEdit(row)}>
                                <PencilIcon className="size-4" />
                                Edit
                              </DropdownMenuItem>
                              {row.status === "ACTIVE" || row.status === "PAUSED" ? (
                                <DropdownMenuItem
                                  onClick={() => void generateNow(row)}
                                  disabled={busy}
                                >
                                  <RefreshCwIcon className="size-4" />
                                  Generate now
                                </DropdownMenuItem>
                              ) : null}
                              {row.status === "ACTIVE" ? (
                                <DropdownMenuItem
                                  onClick={() => void patchStatus(row, "PAUSED")}
                                  disabled={busy}
                                >
                                  <PauseIcon className="size-4" />
                                  Pause
                                </DropdownMenuItem>
                              ) : null}
                              {row.status === "PAUSED" || row.status === "ENDED" ? (
                                <DropdownMenuItem
                                  onClick={() => void patchStatus(row, "ACTIVE")}
                                  disabled={busy}
                                >
                                  <PlayIcon className="size-4" />
                                  Resume
                                </DropdownMenuItem>
                              ) : null}
                              {row.status !== "ENDED" ? (
                                <DropdownMenuItem
                                  onClick={() => void patchStatus(row, "ENDED")}
                                  disabled={busy}
                                >
                                  <SquareIcon className="size-4" />
                                  End schedule
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setPendingDelete(row)}
                              >
                                <Trash2Icon className="size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
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
          </div>
        </Card>
      )}

      <RecurringScheduleDrawer
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        mode={editing ? "edit" : "create"}
        invoices={invoices}
        clients={clients}
        currency={currency}
        editing={editing}
        onSaved={(row) => {
          upsertRow(row);
          router.refresh();
        }}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.name}” will be removed. Invoices already created from this schedule
              stay in your invoices list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
