"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BellIcon,
  CheckCheckIcon,
  InfoIcon,
  Loader2Icon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { NotificationRow } from "@/features/notifications/components/notification-row";
import { TablePagination } from "@/components/data-table/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import {
  NOTIFICATION_TYPE_LABELS,
} from "@/lib/notifications/labels";
import type { NotificationListItem } from "@/lib/notifications/types";
import type { NotificationType } from "@easy-invoice/db";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;

type ReadFilter = "all" | "read" | "unread";

const READ_FILTER_ITEMS: { value: ReadFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

export const NOTIFICATIONS_INFO =
  "Updates about client activity, payments, and team changes for your account. Mark items read, delete them, or open linked invoices and estimates.";

export function NotificationsInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="About notifications"
          />
        }
      >
        <InfoIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={6} className="w-80 gap-0">
        <p className="text-sm text-muted-foreground">{NOTIFICATIONS_INFO}</p>
      </PopoverContent>
    </Popover>
  );
}

type NotificationsPageContentProps = {
  initialNotifications: NotificationListItem[];
  initialTotalCount: number;
  initialUnreadCount: number;
};

export function NotificationsPageContent({
  initialNotifications,
  initialTotalCount,
  initialUnreadCount,
}: NotificationsPageContentProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "ALL">("ALL");
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        read: readFilter,
      });
      if (typeFilter !== "ALL") params.set("type", typeFilter);

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        notifications: NotificationListItem[];
        totalCount: number;
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setTotalCount(data.totalCount);
      setUnreadCount(data.unreadCount);
    } catch {
      toast.error("Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, readFilter, typeFilter]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    setPage(1);
  }, [readFilter, typeFilter, pageSize]);

  function handleReadChange(id: string, read: boolean) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read } : n)),
    );
    setUnreadCount((count) => {
      if (read) return Math.max(0, count - 1);
      return count + 1;
    });
  }

  function handleDelete(id: string) {
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      return prev.filter((n) => n.id !== id);
    });
    setTotalCount((count) => Math.max(0, count - 1));
  }

  async function handleMarkAllRead() {
    setBulkLoading("read");
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      toast.error("Could not mark notifications as read");
    } finally {
      setBulkLoading(null);
    }
  }

  async function handleClearRead() {
    setBulkLoading("clear");
    try {
      const res = await fetch("/api/notifications?scope=read", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchNotifications();
    } catch {
      toast.error("Could not clear read notifications");
    } finally {
      setBulkLoading(null);
    }
  }

  const typeFilterItems = useMemo(
    () => [
      { value: "ALL" as const, label: "All types" },
      ...(Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[]).map((type) => ({
        value: type,
        label: NOTIFICATION_TYPE_LABELS[type],
      })),
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Notifications"
        titleAddon={
          <span className="hidden sm:inline-flex">
            <NotificationsInfoPopover />
          </span>
        }
        description={
          <span className="sm:hidden">{NOTIFICATIONS_INFO}</span>
        }
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                className={pageHeaderActionClass}
                onClick={() => void handleMarkAllRead()}
                disabled={bulkLoading !== null}
              >
                {bulkLoading === "read" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CheckCheckIcon className="size-4" />
                )}
                Mark all read
              </Button>
            )}
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              onClick={() => void handleClearRead()}
              disabled={bulkLoading !== null}
            >
              {bulkLoading === "clear" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <Trash2Icon className="size-4" />
              )}
              Clear read
            </Button>
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              render={<Link href="/settings/notifications" />}
            >
              <SettingsIcon className="size-4" />
              Preferences
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <BellIcon className="size-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <Badge variant="default">{unreadCount} unread</Badge>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={readFilter}
                onValueChange={(value) => setReadFilter(value as ReadFilter)}
                items={READ_FILTER_ITEMS}
              >
                <SelectTrigger className="w-full data-[size=default]:h-8 sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {READ_FILTER_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={typeFilter}
                onValueChange={(value) =>
                  setTypeFilter(value as NotificationType | "ALL")
                }
                items={typeFilterItems}
              >
                <SelectTrigger className="w-full data-[size=default]:h-8 sm:w-[180px]">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent align="end">
                  {typeFilterItems.map((item) => (
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
          ) : notifications.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No notifications match your filters.
            </p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onReadChange={handleReadChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          <TablePagination
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            totalCount={totalCount}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            className="border-0 px-0"
          />
        </CardContent>
      </Card>
    </>
  );
}
