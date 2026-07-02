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
import { downloadEstimatePdf } from "@/lib/estimate-pdf-client";
import {
  formatDate,
  formatMoney,
  estimateStatusLabel,
  estimateStatusVariant,
} from "@/lib/estimates";
import type { EstimateStatus } from "@easy-invoice/db";

export type EstimateRow = {
  id: string;
  number: string;
  status: EstimateStatus;
  total: string;
  currency: string;
  validUntil: string | null;
  clientName: string | null;
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...(
    ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"] as EstimateStatus[]
  ).map((status) => ({
    value: status,
    label: estimateStatusLabel(status),
  })),
];

type EstimatesTableProps = {
  estimates: EstimateRow[];
};

export function EstimatesTable({ estimates }: EstimatesTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const table = useListTable<EstimateRow>({
    tableId: "estimates",
    data: estimates,
    searchKeys: ["number", "clientName"],
    filterOptions: STATUS_FILTER_OPTIONS,
    defaultFilter: "all",
    filterFn: (row, filter) => filter === "all" || row.status === filter,
    defaultSortKey: "validUntil",
    defaultSortDirection: "desc",
    getSortValue: (row, key) => {
      if (key === "total") return Number(row.total);
      if (key === "number") return row.number;
      if (key === "clientName") return row.clientName ?? "";
      if (key === "status") return row.status;
      if (key === "validUntil") return row.validUntil ?? "";
      return null;
    },
  });

  async function handleDownload(estimate: EstimateRow) {
    setLoadingId(estimate.id);
    try {
      await downloadEstimatePdf(estimate.id, estimate.number);
    } catch {
      // Toast handled in downloadEstimatePdf
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(estimate: EstimateRow) {
    if (!confirm(`Delete estimate ${estimate.number}?`)) return;

    setLoadingId(estimate.id);
    try {
      const response = await fetch(`/api/estimates/${estimate.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Estimate deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete estimate");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      <TableToolbar
        search={table.searchQuery}
        onSearchChange={table.setSearchQuery}
        searchPlaceholder="Search estimates..."
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
              label="Valid until"
              column="validUntil"
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
                {table.hasActiveFilters ? "No estimates match your filters." : "No estimates."}
              </TableCell>
            </TableRow>
          ) : (
            table.pageRows.map((estimate) => (
              <TableRow key={estimate.id}>
                <TableCell>
                  <Link href={`/estimates/${estimate.id}`} className="font-medium hover:underline">
                    {estimate.number}
                  </Link>
                </TableCell>
                <TableCell>{estimate.clientName ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={estimateStatusVariant(estimate.status)}>
                    {estimateStatusLabel(estimate.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(estimate.total, estimate.currency)}
                </TableCell>
                <TableCell className="w-40 pl-6 text-muted-foreground">
                  {estimate.validUntil ? formatDate(estimate.validUntil) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loadingId === estimate.id}
                      aria-label="Estimate actions"
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44 w-48">
                      <DropdownMenuItem render={<Link href={`/estimates/${estimate.id}`} />}>
                        <EyeIcon className="size-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href={`/estimates/${estimate.id}/edit`} />}>
                        <PencilIcon className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(estimate)}>
                        <DownloadIcon className="size-4" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href={`/estimates/${estimate.id}`} />}>
                        <SendIcon className="size-4" />
                        Send estimate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(estimate)}
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
