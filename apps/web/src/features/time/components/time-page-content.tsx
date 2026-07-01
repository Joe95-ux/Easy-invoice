"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ClockIcon,
  DownloadIcon,
  FileTextIcon,
  Loader2Icon,
  PencilIcon,
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { LogTimeDialog } from "@/features/time/components/log-time-dialog";
import { ImportTimeDialog } from "@/features/time/components/import-time-dialog";
import type { ClientListItem } from "@/lib/clients";
import { formatDate, formatMoney } from "@/lib/invoices";
import { formatDuration } from "@/lib/time-tracking/format";
import { invoiceFromTimeUrl } from "@/lib/time-tracking/invoice-from-time";
import { cn } from "@/lib/utils";

export type SerializedTimeEntry = {
  id: string;
  clientId: string | null;
  clientName: string | null;
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

type TimePageContentProps = {
  entries: SerializedTimeEntry[];
  clients: ClientListItem[];
  currency: string;
  defaultHourlyRate: number | null;
};

function isInvoiceable(entry: SerializedTimeEntry) {
  return !entry.invoicedAt && entry.billable && Boolean(entry.clientId);
}

export function TimePageContent({
  entries: initialEntries,
  clients,
  currency,
  defaultHourlyRate,
}: TimePageContentProps) {
  const router = useRouter();
  const [isInvoicing, startInvoicing] = useTransition();
  const [filter, setFilter] = useState<"all" | "unbilled">("all");
  const [logOpen, setLogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<SerializedTimeEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<SerializedTimeEntry | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const entries = useMemo(() => {
    if (filter === "unbilled") {
      return initialEntries.filter((entry) => !entry.invoicedAt && entry.billable);
    }
    return initialEntries;
  }, [filter, initialEntries]);

  const invoiceableEntries = useMemo(
    () => entries.filter(isInvoiceable),
    [entries],
  );

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

    startInvoicing(() => {
      router.push(
        invoiceFromTimeUrl({
          clientId,
          timeEntryIds: selectedEntries.map((entry) => entry.id),
        }),
      );
    });
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
        <div className="mb-4 flex flex-wrap items-center gap-3">
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
      )}

      {selectedEntries.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <p className="text-sm font-medium">
            {selectedEntries.length} selected
          </p>
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
          {selectedClientIds.size > 1 && (
            <p className="text-xs text-muted-foreground">
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
          <Table stickyColumnWidths={["3.25rem", "6.5rem"]}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  {invoiceableEntries.length > 0 && (
                    <Checkbox
                      checked={allInvoiceableSelected}
                      onCheckedChange={(checked) => toggleAll(checked === true)}
                      aria-label="Select all invoiceable entries"
                    />
                  )}
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const amount = entry.hours * entry.hourlyRate;
                const isBilled = Boolean(entry.invoicedAt);
                const canInvoice = isInvoiceable(entry);

                return (
                  <TableRow key={entry.id} data-state={selectedIds.has(entry.id) ? "selected" : undefined}>
                    <TableCell>
                      {canInvoice && (
                        <Checkbox
                          checked={selectedIds.has(entry.id)}
                          onCheckedChange={(checked) => toggleEntry(entry.id, checked === true)}
                          aria-label={`Select ${entry.description}`}
                        />
                      )}
                    </TableCell>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>{entry.clientName ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{entry.description}</TableCell>
                    <TableCell className="text-right">{formatDuration(entry.durationMinutes)}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(entry.hourlyRate, currency)}
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(amount, currency)}</TableCell>
                    <TableCell>
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
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {canInvoice && (
                          <Link
                            href={invoiceFromTimeUrl({
                              clientId: entry.clientId!,
                              timeEntryIds: [entry.id],
                            })}
                            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                            aria-label="Create invoice from time entry"
                          >
                            <FileTextIcon className="size-4" />
                          </Link>
                        )}
                        {!isBilled && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setEditingEntry(entry);
                                setLogOpen(true);
                              }}
                              aria-label="Edit time entry"
                            >
                              <PencilIcon className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteEntry(entry)}
                              aria-label="Delete time entry"
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <LogTimeDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        clients={clients}
        defaultHourlyRate={defaultHourlyRate}
        entry={editingEntry}
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
