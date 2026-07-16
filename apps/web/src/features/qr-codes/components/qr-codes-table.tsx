"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpDownIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ListFilterIcon,
  LockIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { TablePagination } from "@/components/data-table/table-pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import {
  QR_STATUS_BADGE_VARIANT,
  QR_STATUS_LABEL,
  QR_TYPE_LABEL,
  qrDestinationSummary,
} from "@/lib/qr-codes/content";
import { qrScanUrl } from "@/lib/qr-codes/url";
import {
  QR_CODE_TYPES,
  type QrCodeStatus,
  type QrCodeType,
  type SerializedQrCode,
} from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | QrCodeStatus;
type TypeFilter = "all" | QrCodeType;
type SortValue = "recent" | "scans" | "modified" | "name";

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All (excludes deleted)" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "DELETED", label: "Deleted" },
];

const TYPE_FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All types" },
  ...QR_CODE_TYPES.map((type) => ({ value: type, label: QR_TYPE_LABEL[type] })),
];

const SORT_OPTIONS: {
  value: SortValue;
  label: string;
  key: string;
  direction: "asc" | "desc";
}[] = [
  { value: "recent", label: "Most recent", key: "createdAt", direction: "desc" },
  { value: "scans", label: "Most scanned", key: "scanCount", direction: "desc" },
  { value: "modified", label: "Last modified", key: "updatedAt", direction: "desc" },
  { value: "name", label: "Name (A–Z)", key: "name", direction: "asc" },
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sortValue, setSortValue] = useState<SortValue>("recent");
  const previewRefs = useRef<Record<string, QrCodePreviewHandle | null>>({});

  const filtersActive = statusFilter !== "all" || typeFilter !== "all";

  const visibleData = useMemo(
    () =>
      qrCodes.filter((qr) => {
        const statusOk =
          statusFilter === "all" ? qr.status !== "DELETED" : qr.status === statusFilter;
        const typeOk = typeFilter === "all" || qr.type === typeFilter;
        return statusOk && typeOk;
      }),
    [qrCodes, statusFilter, typeFilter],
  );

  const table = useListTable<SerializedQrCode>({
    tableId: "qr-codes",
    data: visibleData,
    searchKeys: ["name"],
    defaultSortKey: "createdAt",
    defaultSortDirection: "desc",
    getSortValue: (row, key) => {
      if (key === "name") return row.name;
      if (key === "scanCount") return row.scanCount;
      if (key === "updatedAt") return row.updatedAt;
      if (key === "createdAt") return row.createdAt;
      return null;
    },
  });

  function applySort(value: SortValue) {
    setSortValue(value);
    const option = SORT_OPTIONS.find((item) => item.value === value);
    if (option) table.setSort(option.key, option.direction);
  }

  function resetFilters() {
    setStatusFilter("all");
    setTypeFilter("all");
  }

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

  async function handleStatus(qr: SerializedQrCode, status: QrCodeStatus, message: string) {
    setLoadingId(qr.id);
    try {
      const response = await fetch(`/api/qr-codes/${qr.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update");
      toast.success(message);
      router.refresh();
    } catch {
      toast.error("Could not update QR code");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDeleteForever(qr: SerializedQrCode) {
    if (!confirm(`Permanently delete "${qr.name}"? This cannot be undone.`)) return;
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
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={table.searchQuery}
            onChange={(event) => table.setSearchQuery(event.target.value)}
            placeholder="Search QR codes..."
            className="h-8 pl-8"
            aria-label="Search QR codes"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              filtersActive ? "border-primary/50 text-foreground" : "border-border",
            )}
            aria-label="Filter"
          >
            <ListFilterIcon className="size-4" />
            {filtersActive && (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Type</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as TypeFilter)}
            >
              {TYPE_FILTER_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {filtersActive && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={resetFilters}>Reset filters</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Sort"
          >
            <ArrowUpDownIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortValue}
              onValueChange={(value) => applySort(value as SortValue)}
            >
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
            <TableHead className="w-28">Status</TableHead>
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
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                {table.searchQuery.trim() || filtersActive
                  ? "No QR codes match your filters."
                  : "No QR codes."}
              </TableCell>
            </TableRow>
          ) : (
            table.pageRows.map((qr) => {
              const TypeIcon = QR_TYPE_ICON[qr.type];
              const isDeleted = qr.status === "DELETED";
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
                      <span className="flex min-w-0 items-center gap-1.5">
                        {isDeleted ? (
                          <span className="truncate font-medium text-muted-foreground">
                            {qr.name}
                          </span>
                        ) : (
                          <Link
                            href={`/qr-codes/${qr.id}/edit`}
                            className="truncate font-medium hover:underline"
                          >
                            {qr.name}
                          </Link>
                        )}
                        {qr.passwordProtected && (
                          <LockIcon
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-label="Password protected"
                          />
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1.5 font-normal">
                      <TypeIcon className="size-3.5" />
                      {QR_TYPE_LABEL[qr.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={QR_STATUS_BADGE_VARIANT[qr.status]} className="font-normal">
                      {QR_STATUS_LABEL[qr.status]}
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
                      <DropdownMenuContent align="end" className="min-w-48 w-52">
                        {isDeleted ? (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleStatus(qr, "ACTIVE", "QR code restored")}
                            >
                              <RotateCcwIcon className="size-4" />
                              Restore
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleDeleteForever(qr)}
                            >
                              <Trash2Icon className="size-4" />
                              Delete permanently
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
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
                            {qr.status === "ACTIVE" ? (
                              <DropdownMenuItem
                                onClick={() => handleStatus(qr, "PAUSED", "QR code paused")}
                              >
                                <PauseIcon className="size-4" />
                                Pause
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleStatus(qr, "ACTIVE", "QR code activated")}
                              >
                                <PlayIcon className="size-4" />
                                Activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleStatus(qr, "DELETED", "QR code deleted")}
                            >
                              <Trash2Icon className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
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
