"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ClipboardListIcon,
  EyeIcon,
  FileTextIcon,
  GitMergeIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { TablePagination } from "@/components/data-table/table-pagination";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";
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
  inviteClientToPortalRequest,
  toastPortalInviteResult,
} from "@/features/clients/lib/invite-client-portal";
import { useListTable } from "@/hooks/use-list-table";
import type { ClientListItem } from "@/lib/clients";
import { formatPhoneForDisplay } from "@/lib/phone";

const CLIENT_FILTER_OPTIONS = [
  { value: "all", label: "All clients" },
  { value: "with-invoices", label: "With invoices" },
  { value: "without-invoices", label: "No invoices" },
];

type ClientsTableProps = {
  clients: ClientListItem[];
  duplicateEmailGroups?: number;
};

export function ClientsTable({
  clients,
  duplicateEmailGroups = 0,
}: ClientsTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ClientListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const table = useListTable<ClientListItem>({
    tableId: "clients",
    data: clients,
    searchKeys: ["name", "email", "phone"],
    filterOptions: CLIENT_FILTER_OPTIONS,
    defaultFilter: "all",
    filterFn: (row, filter) => {
      if (filter === "with-invoices") return row._count.invoices > 0;
      if (filter === "without-invoices") return row._count.invoices === 0;
      return true;
    },
    defaultSortKey: "name",
    defaultSortDirection: "asc",
    getSortValue: (row, key) => {
      if (key === "_count") return row._count.invoices;
      if (key === "email" || key === "phone" || key === "name") return row[key] ?? "";
      return row[key as keyof ClientListItem];
    },
  });

  async function confirmMergeDuplicates() {
    setMerging(true);
    try {
      const response = await fetch("/api/clients/merge-duplicates", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not merge duplicates",
        );
      }
      const removed = typeof data.clientsRemoved === "number" ? data.clientsRemoved : 0;
      const groups = typeof data.groupsMerged === "number" ? data.groupsMerged : 0;
      if (removed === 0) {
        toast.message("No duplicate clients to merge");
      } else {
        toast.success(
          `Merged ${groups} email group${groups === 1 ? "" : "s"} (${removed} duplicate${removed === 1 ? "" : "s"} removed)`,
        );
      }
      setMergeOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not merge duplicates");
    } finally {
      setMerging(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    setDeleting(true);
    setLoadingId(pendingDelete.id);
    try {
      const response = await fetch(`/api/clients/${pendingDelete.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Client deleted");
      setPendingDelete(null);
      router.refresh();
    } catch {
      toast.error("Could not delete client");
    } finally {
      setDeleting(false);
      setLoadingId(null);
    }
  }

  async function handleInviteToPortal(client: ClientListItem) {
    if (!client.email?.trim()) {
      toast.error("Add an email on this client before inviting them to the portal");
      return;
    }

    setLoadingId(client.id);
    try {
      const result = await inviteClientToPortalRequest(client.id);
      toastPortalInviteResult(result, client.email, toast);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send invite");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      {duplicateEmailGroups > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {duplicateEmailGroups} email
            {duplicateEmailGroups === 1 ? " appears" : "s appear"} on more than one client.
            Merge to keep invoices and the portal in sync.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={merging}
            onClick={() => setMergeOpen(true)}
          >
            {merging ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <GitMergeIcon className="size-4" />
            )}
            {merging ? "Merging…" : "Merge duplicates"}
          </Button>
        </div>
      ) : null}
      <TableToolbar
        search={table.searchQuery}
        onSearchChange={table.setSearchQuery}
        searchPlaceholder="Search clients..."
        filter={table.filter}
        onFilterChange={table.setFilter}
        filterOptions={table.filterOptions}
        filterLabel="Clients"
      />

      <Table stickyColumnWidths={["5.5rem", "10rem"]}>
        <TableHeader>
          <TableRow>
            <SortableTableHead
              label="Name"
              column="name"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
            />
            <SortableTableHead
              label="Email"
              column="email"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
            />
            <SortableTableHead
              label="Phone"
              column="phone"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
            />
            <SortableTableHead
              label="Invoices"
              column="_count"
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
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                {table.hasActiveFilters ? "No clients match your filters." : "No clients."}
              </TableCell>
            </TableRow>
          ) : (
            table.pageRows.map((client) => (
              <TableRow
                key={client.id}
                className="cursor-pointer"
                onClick={() => router.push(`/clients/${client.id}`)}
              >
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell className="text-muted-foreground">{client.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {client.phone
                    ? formatPhoneForDisplay(client.phone, { defaultCountry: client.country })
                    : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{client._count.invoices}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loadingId === client.id}
                      aria-label="Client actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44 w-48">
                      <DropdownMenuItem
                        render={<Link href={`/clients/${client.id}`} />}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <EyeIcon className="size-4" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        render={<Link href={`/invoices/new?clientId=${client.id}`} />}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <FileTextIcon className="size-4" />
                        New invoice
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        render={<Link href={`/estimates/new?clientId=${client.id}`} />}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ClipboardListIcon className="size-4" />
                        New estimate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!client.email?.trim() || loadingId === client.id}
                        title={
                          client.email?.trim()
                            ? undefined
                            : "Add an email on this client first"
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleInviteToPortal(client);
                        }}
                      >
                        <SendIcon className="size-4" />
                        Invite to portal
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDelete(client);
                        }}
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

      <ConfirmActionDialog
        open={mergeOpen}
        onOpenChange={(open) => {
          if (!open && !merging) setMergeOpen(false);
        }}
        title="Merge duplicate clients?"
        description="Clients that share the same email will be merged. Invoices and estimates move to one client record per email."
        confirmLabel="Merge"
        confirmingLabel="Merging..."
        confirming={merging}
        onConfirm={confirmMergeDuplicates}
      />

      <ConfirmActionDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
        title="Delete client?"
        description={
          <>
            Delete{" "}
            <span className="font-medium text-foreground">
              {pendingDelete?.name ?? "this client"}
            </span>
            ? Their invoices will remain but will no longer be linked to this client.
            Recurring invoice schedules for this client will be deleted.
          </>
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        confirming={deleting}
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
