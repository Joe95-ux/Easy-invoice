"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
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
import {
  QrCodePreview,
  type QrCodePreviewHandle,
} from "@/features/qr-codes/components/qr-code-preview";
import { QR_TYPE_ICON } from "@/features/qr-codes/components/qr-type-meta";
import { useListTable } from "@/hooks/use-list-table";
import { formatDate } from "@/lib/invoices";
import { QR_TYPE_LABEL, qrDestinationSummary } from "@/lib/qr-codes/content";
import { qrScanUrl } from "@/lib/qr-codes/url";
import { QR_CODE_TYPES, type SerializedQrCode } from "@/lib/qr-codes/types";

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  ...QR_CODE_TYPES.map((type) => ({ value: type, label: QR_TYPE_LABEL[type] })),
];

function slugForFile(name: string): string {
  return name.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "qr-code";
}

type QrCodesTableProps = {
  qrCodes: SerializedQrCode[];
  origin: string;
  companyLogoUrl?: string | null;
};

export function QrCodesTable({ qrCodes, origin, companyLogoUrl }: QrCodesTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const previewRefs = useRef<Record<string, QrCodePreviewHandle | null>>({});

  const table = useListTable<SerializedQrCode>({
    tableId: "qr-codes",
    data: qrCodes,
    searchKeys: ["name"],
    filterOptions: TYPE_FILTER_OPTIONS,
    defaultFilter: "all",
    filterFn: (row, filter) => filter === "all" || row.type === filter,
    defaultSortKey: "createdAt",
    defaultSortDirection: "desc",
    getSortValue: (row, key) => {
      if (key === "name") return row.name;
      if (key === "type") return row.type;
      if (key === "scanCount") return row.scanCount;
      if (key === "createdAt") return row.createdAt;
      return null;
    },
  });

  function handleDownload(qr: SerializedQrCode) {
    previewRefs.current[qr.id]?.download(slugForFile(qr.name));
  }

  async function handleCopy(qr: SerializedQrCode) {
    try {
      await navigator.clipboard.writeText(qrScanUrl(origin, qr.token));
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  async function handleDelete(qr: SerializedQrCode) {
    if (!confirm(`Delete "${qr.name}"? Printed codes will stop working.`)) return;
    setLoadingId(qr.id);
    try {
      const response = await fetch(`/api/qr-codes/${qr.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("QR code deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete QR code");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div>
      <TableToolbar
        search={table.searchQuery}
        onSearchChange={table.setSearchQuery}
        searchPlaceholder="Search QR codes..."
        filter={table.filter}
        onFilterChange={table.setFilter}
        filterOptions={table.filterOptions}
        filterLabel="Type"
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
              label="Type"
              column="type"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
              className="w-36"
            />
            <TableHead>Destination</TableHead>
            <SortableTableHead
              label="Scans"
              column="scanCount"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
              className="w-24 text-right [&_button]:ml-auto"
            />
            <SortableTableHead
              label="Created"
              column="createdAt"
              sortKey={table.sortKey}
              sortDirection={table.sortDirection}
              onSort={table.toggleSort}
              className="w-36 pl-6"
            />
            <TableHead className="w-14 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.pageRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                {table.hasActiveFilters
                  ? "No QR codes match your filters."
                  : "No QR codes."}
              </TableCell>
            </TableRow>
          ) : (
            table.pageRows.map((qr) => {
              const TypeIcon = QR_TYPE_ICON[qr.type];
              return (
                <TableRow key={qr.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <QrCodePreview
                        ref={(handle) => {
                          previewRefs.current[qr.id] = handle;
                        }}
                        value={qrScanUrl(origin, qr.token)}
                        design={qr.design}
                        logoUrl={companyLogoUrl}
                        size={40}
                        frame={false}
                        className="shrink-0 ring-1 ring-border/60"
                      />
                      <Link
                        href={`/qr-codes/${qr.id}/edit`}
                        className="font-medium hover:underline"
                      >
                        {qr.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1.5 font-normal">
                      <TypeIcon className="size-3.5" />
                      {QR_TYPE_LABEL[qr.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                    {qrDestinationSummary(qr.type, qr.content)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{qr.scanCount}</TableCell>
                  <TableCell className="w-36 pl-6 text-muted-foreground">
                    {formatDate(qr.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={loadingId === qr.id}
                        aria-label="QR code actions"
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44 w-48">
                        <DropdownMenuItem render={<Link href={`/qr-codes/${qr.id}/edit`} />}>
                          <PencilIcon className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(qr)}>
                          <DownloadIcon className="size-4" />
                          Download PNG
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopy(qr)}>
                          <CopyIcon className="size-4" />
                          Copy link
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          render={
                            <a
                              href={qrScanUrl(origin, qr.token)}
                              target="_blank"
                              rel="noreferrer"
                            />
                          }
                        >
                          <ExternalLinkIcon className="size-4" />
                          Open link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => handleDelete(qr)}>
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
  );
}
