"use client";

import { useCallback, useEffect, useState } from "react";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const CATEGORY_VARIANT: Record<AuditCategory, "default" | "secondary" | "outline"> = {
  TEAM: "default",
  SETTINGS: "secondary",
  DOCUMENT: "outline",
};

type CompanyActivityLogProps = {
  initialEvents: AuditEventListItem[];
  initialCursor: string | null;
};

export function CompanyActivityLog({
  initialEvents,
  initialCursor,
}: CompanyActivityLogProps) {
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
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Activity log</CardTitle>
          <CardDescription>
            Immutable record of team, settings, and destructive changes. Admins receive email
            alerts for sensitive actions. Export to CSV for disputes or record-keeping.
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={handleExport} disabled={exporting || loading}>
            {exporting ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <DownloadIcon className="size-4" />
                Export CSV
              </>
            )}
          </Button>
          <Select
          value={category}
          onValueChange={(value) => setCategory(value as AuditCategory | "ALL")}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All activity</SelectItem>
            <SelectItem value="TEAM">Team</SelectItem>
            <SelectItem value="SETTINGS">Settings</SelectItem>
            <SelectItem value="DOCUMENT">Documents</SelectItem>
          </SelectContent>
        </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2Icon className="mr-2 size-4 animate-spin" />
            Loading activity…
          </div>
        ) : events.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No activity recorded yet. Team and settings changes will appear here.
          </p>
        ) : (
          <div className="space-y-0 divide-y divide-border rounded-lg border border-border">
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
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
