"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EyeIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { TablePagination } from "@/components/data-table/table-pagination";
import { TableToolbar } from "@/components/data-table/table-toolbar";
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
import { useListTable } from "@/hooks/use-list-table";
import type { ProjectStatus } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/invoices";
import {
  projectStatusLabel,
  projectStatusVariant,
  type serializeProjectListItem,
} from "@/lib/projects";

export type ProjectRow = ReturnType<typeof serializeProjectListItem>;

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"] as ProjectStatus[]).map((status) => ({
    value: status,
    label: projectStatusLabel(status),
  })),
];

type ProjectsTableProps = {
  projects: ProjectRow[];
};

export function ProjectsTable({ projects }: ProjectsTableProps) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<ProjectRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const table = useListTable<ProjectRow>({
    tableId: "projects",
    data: projects,
    searchKeys: ["name", "clientName"],
    filterOptions: STATUS_FILTER_OPTIONS,
    defaultFilter: "all",
    filterFn: (row, filter) => filter === "all" || row.status === filter,
    defaultSortKey: "updatedAt",
    defaultSortDirection: "desc",
    getSortValue: (row, key) => {
      if (key === "name") return row.name;
      if (key === "clientName") return row.clientName ?? "";
      if (key === "status") return row.status;
      if (key === "budget") return row.budget ?? 0;
      if (key === "dueDate") return row.dueDate ?? "";
      if (key === "updatedAt") return row.updatedAt;
      return null;
    },
  });

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${pendingDelete.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete");
      }
      toast.success("Project deleted");
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete project");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <TableToolbar
        search={table.searchQuery}
        onSearchChange={table.setSearchQuery}
        searchPlaceholder="Search projects…"
        filter={table.filter}
        onFilterChange={table.setFilter}
        filterOptions={table.filterOptions}
        filterLabel="Status"
      />

      <Table>
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
              label="Budget"
              column="budget"
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
              className="w-36"
            />
            <TableHead className="w-14 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.pageRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {table.hasActiveFilters ? "No projects match your filters." : "No projects."}
              </TableCell>
            </TableRow>
          ) : (
            table.pageRows.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell>{project.clientName ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={projectStatusVariant(project.status)}>
                    {projectStatusLabel(project.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {project.budget == null ? "—" : formatMoney(project.budget, project.currency)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(project.dueDate)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Project actions"
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44 w-48">
                      <DropdownMenuItem render={<Link href={`/projects/${project.id}`} />}>
                        <EyeIcon className="size-4" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setPendingDelete(project)}
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
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
        title="Delete project?"
        description={
          <>
            Delete{" "}
            <span className="font-medium text-foreground">
              {pendingDelete?.name ?? "this project"}
            </span>
            ? Linked estimates, invoices, and time stay — they just become unlinked.
          </>
        }
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        confirming={deleting}
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
