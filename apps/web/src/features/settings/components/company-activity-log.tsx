"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DownloadIcon, HistoryIcon, InfoIcon, Loader2Icon, UsersRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { TablePagination } from "@/components/data-table/table-pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ActivityDateRangePicker,
  DEFAULT_ACTIVITY_DATE_RANGE,
  type ActivityDateRangeValue,
} from "@/features/settings/components/activity-date-range-picker";
import { AUDIT_PAGE_SIZE_OPTIONS } from "@/lib/audit/constants";
import type { AuditEventListItem } from "@/lib/audit/types";
import type { AuditCategory } from "@/lib/db";
import { formatDateTime } from "@/lib/invoices";

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  TEAM: "Team",
  SETTINGS: "Settings",
  DOCUMENT: "Documents",
  AUTH: "Sign-in",
};

const CATEGORY_VARIANT: Record<
  AuditCategory,
  "default" | "info" | "warning" | "secondary"
> = {
  TEAM: "default",
  SETTINGS: "info",
  DOCUMENT: "warning",
  AUTH: "secondary",
};

const CATEGORY_FILTER_ITEMS: { value: AuditCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "All activity" },
  { value: "AUTH", label: "Sign-in" },
  { value: "TEAM", label: "Team" },
  { value: "SETTINGS", label: "Settings" },
  { value: "DOCUMENT", label: "Documents" },
];

export const ACTIVITY_LOG_INFO =
  "Immutable record of sign-ins, team changes, settings updates, and destructive actions. Admins receive email alerts for sensitive actions. Export to CSV for disputes or record-keeping.";

export function ActivityLogInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="About activity log"
          />
        }
      >
        <InfoIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={6} className="w-80 gap-0">
        <p className="text-sm text-muted-foreground">{ACTIVITY_LOG_INFO}</p>
      </PopoverContent>
    </Popover>
  );
}

type ActivityLogPageContentProps = {
  initialEvents: AuditEventListItem[];
  initialTotalCount: number;
  initialPage: number;
  initialPageSize: number;
  initialPageCount: number;
};

type AuditListResponse = {
  events: AuditEventListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function ActivityLogPageContent({
  initialEvents,
  initialTotalCount,
  initialPage,
  initialPageSize,
  initialPageCount,
}: ActivityLogPageContentProps) {
  const [events, setEvents] = useState(initialEvents);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pageCount, setPageCount] = useState(initialPageCount);
  const [category, setCategory] = useState<AuditCategory | "ALL">("ALL");
  const [dateRange, setDateRange] = useState<ActivityDateRangeValue>(
    DEFAULT_ACTIVITY_DATE_RANGE,
  );
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchEvents = useCallback(
    async (opts: {
      category: AuditCategory | "ALL";
      dateRange: ActivityDateRangeValue;
      page: number;
      pageSize: number;
    }) => {
      const params = new URLSearchParams();
      if (opts.category !== "ALL") params.set("category", opts.category);
      if (opts.dateRange.from) params.set("from", opts.dateRange.from);
      if (opts.dateRange.to) params.set("to", opts.dateRange.to);
      params.set("page", String(opts.page));
      params.set("pageSize", String(opts.pageSize));

      const response = await fetch(`/api/company/audit?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load activity");

      const data = (await response.json()) as AuditListResponse;
      setEvents(data.events);
      setTotalCount(data.totalCount);
      setPage(data.page);
      setPageSize(data.pageSize);
      setPageCount(data.pageCount);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await fetchEvents({ category, dateRange, page, pageSize });
        if (cancelled) return;
      } catch {
        if (!cancelled) {
          setEvents([]);
          setTotalCount(0);
          setPageCount(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [category, dateRange, page, pageSize, fetchEvents]);

  function handleCategoryChange(value: AuditCategory | "ALL") {
    setCategory(value);
    setPage(1);
  }

  function handleDateRangeChange(next: ActivityDateRangeValue) {
    setDateRange(next);
    setPage(1);
  }

  function handlePageSizeChange(next: number) {
    setPageSize(next);
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (category !== "ALL") params.set("category", category);
      if (dateRange.from) params.set("from", dateRange.from);
      if (dateRange.to) params.set("to", dateRange.to);

      const response = await fetch(`/api/company/audit/export?${params.toString()}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? "activity-log.csv";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export activity log");
    } finally {
      setExporting(false);
    }
  }

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <>
      <PageHeader
        title="Activity log"
        titleAddon={
          <span className="hidden sm:inline-flex">
            <ActivityLogInfoPopover />
          </span>
        }
        description={<span className="sm:hidden">{ACTIVITY_LOG_INFO}</span>}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              onClick={() => void handleExport()}
              disabled={exporting || loading}
            >
              {exporting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <DownloadIcon className="size-4" />
              )}
              Export CSV
            </Button>
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              render={<Link href="/members" />}
            >
              <UsersRoundIcon className="size-4" />
              Members
            </Button>
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              render={<Link href="/settings/general" />}
            >
              Settings
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <HistoryIcon className="size-4 text-muted-foreground" />
              {!loading && totalCount > 0 && (
                <Badge variant="secondary">{totalCount} events</Badge>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ActivityDateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
              />
              <Select
                value={category}
                onValueChange={(value) =>
                  handleCategoryChange(value as AuditCategory | "ALL")
                }
                items={CATEGORY_FILTER_ITEMS}
              >
                <SelectTrigger
                  className="w-full data-[size=default]:h-8 sm:w-[180px]"
                  aria-label="Filter by category"
                >
                  <SelectValue placeholder="All activity" />
                </SelectTrigger>
                <SelectContent align="end">
                  {CATEGORY_FILTER_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No activity in this range. Sign-ins, team, and settings changes will
              appear here.
            </p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={CATEGORY_VARIANT[event.category]}>
                        {CATEGORY_LABELS[event.category]}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        {event.summary}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">By {event.actorLabel}</p>
                  </div>
                  <time
                    className="shrink-0 text-xs text-muted-foreground sm:text-right"
                    dateTime={event.createdAt}
                  >
                    {formatDateTime(event.createdAt)}
                  </time>
                </div>
              ))}
            </div>
          )}

          {!loading && totalCount > 0 ? (
            <TablePagination
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              pageSizeOptions={AUDIT_PAGE_SIZE_OPTIONS}
              totalCount={totalCount}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
