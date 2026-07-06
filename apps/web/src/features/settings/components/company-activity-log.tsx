"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DownloadIcon, HistoryIcon, InfoIcon, Loader2Icon, UsersRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
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
import type { AuditEventListItem } from "@/lib/audit/types";
import type { AuditCategory } from "@/lib/db";
import { formatDateTime } from "@/lib/invoices";

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  TEAM: "Team",
  SETTINGS: "Settings",
  DOCUMENT: "Documents",
};

const CATEGORY_VARIANT: Record<AuditCategory, "default" | "info" | "warning"> = {
  TEAM: "default",
  SETTINGS: "info",
  DOCUMENT: "warning",
};

const CATEGORY_FILTER_ITEMS: { value: AuditCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "All activity" },
  { value: "TEAM", label: "Team" },
  { value: "SETTINGS", label: "Settings" },
  { value: "DOCUMENT", label: "Documents" },
];

export const ACTIVITY_LOG_INFO =
  "Immutable record of team, settings, and destructive changes. Admins receive email alerts for sensitive actions. Export to CSV for disputes or record-keeping.";

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
  initialCursor: string | null;
};

export function ActivityLogPageContent({
  initialEvents,
  initialCursor,
}: ActivityLogPageContentProps) {
  const [events, setEvents] = useState(initialEvents);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [category, setCategory] = useState<AuditCategory | "ALL">("ALL");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchEvents = useCallback(
    async (opts: { category: AuditCategory | "ALL"; cursor?: string; append?: boolean }) => {
      const params = new URLSearchParams();
      if (opts.category !== "ALL") params.set("category", opts.category);
      if (opts.cursor) params.set("cursor", opts.cursor);

      const response = await fetch(`/api/company/audit?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load activity");

      const data = (await response.json()) as {
        events: AuditEventListItem[];
        nextCursor: string | null;
      };

      setEvents((current) => (opts.append ? [...current, ...data.events] : data.events));
      setCursor(data.nextCursor);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await fetchEvents({ category });
        if (cancelled) return;
      } catch {
        if (!cancelled) {
          setEvents([]);
          setCursor(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [category, fetchEvents]);

  async function handleLoadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      await fetchEvents({ category, cursor, append: true });
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (category !== "ALL") params.set("category", category);

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
              render={<Link href="/settings" />}
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
              {!loading && events.length > 0 && (
                <Badge variant="secondary">{events.length} shown</Badge>
              )}
            </div>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as AuditCategory | "ALL")}
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

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No activity recorded yet. Team and settings changes will appear here.
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
                      <span className="text-sm font-medium text-foreground">{event.summary}</span>
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

          {cursor && !loading && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => void handleLoadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
