"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ClipboardListIcon,
  EyeIcon,
  FileTextIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
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
import type { ClientListItem } from "@/lib/clients";

const CLIENT_FILTER_OPTIONS = [
  { value: "all", label: "All clients" },
  { value: "with-invoices", label: "With invoices" },
  { value: "without-invoices", label: "No invoices" },
];

type ClientsTableProps = {
  clients: ClientListItem[];
};

export function ClientsTable({ clients }: ClientsTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

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

  async function handleDelete(client: ClientListItem) {
    if (!confirm(`Delete ${client.name}? Their invoices will remain but will no longer be linked to this client.`)) {
      return;
    }

    setLoadingId(client.id);
    try {
      const response = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Client deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete client");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
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
                <TableCell className="text-muted-foreground">{client.phone ?? "—"}</TableCell>
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(client);
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
    </div>
  );
}
