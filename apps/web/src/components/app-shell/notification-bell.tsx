"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BellIcon,
  CheckCheckIcon,
  Loader2Icon,
  SettingsIcon,
} from "lucide-react";
import Pusher from "pusher-js";
import { toast } from "sonner";
import { NotificationRow } from "@/features/notifications/components/notification-row";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { NotificationListItem } from "@/lib/notifications/types";

const DROPDOWN_LIMIT = 10;

type NotificationBellProps = {
  memberId: string;
};

export function NotificationBell({ memberId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    const params = new URLSearchParams({ limit: String(DROPDOWN_LIMIT) });
    const res = await fetch(`/api/notifications?${params.toString()}`);
    if (!res.ok) return;

    const data = (await res.json()) as {
      notifications: NotificationListItem[];
      totalCount: number;
      unreadCount: number;
    };

    setNotifications(data.notifications);
    setTotalCount(data.totalCount);
    setUnreadCount(data.unreadCount);
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    const pusher = new Pusher(key, {
      cluster,
      channelAuthorization: {
        endpoint: "/api/pusher/auth",
        transport: "ajax",
      },
    });

    const channel = pusher.subscribe(`private-member-${memberId}`);
    channel.bind("notification", (data: NotificationListItem) => {
      setNotifications((prev) => [data, ...prev].slice(0, DROPDOWN_LIMIT));
      setTotalCount((count) => count + 1);
      setUnreadCount((count) => count + 1);
      toast(data.title, { description: data.body });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-member-${memberId}`);
      pusher.disconnect();
    };
  }, [memberId]);

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setLoading(true);
      await fetchNotifications();
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      toast.error("Could not mark notifications as read");
    }
  }

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

  const showViewAll = totalCount > DROPDOWN_LIMIT;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Notifications" />
        }
      >
        <div className="relative">
          <BellIcon className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(calc(100vw-2rem),24rem)] gap-0 p-0 sm:w-96"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="cursor-pointer"
                onClick={() => void handleMarkAllRead()}
                aria-label="Mark all read"
              >
                <CheckCheckIcon className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer"
              render={<Link href="/settings/notifications" onClick={() => setOpen(false)} />}
              aria-label="Notification settings"
            >
              <SettingsIcon className="size-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[min(20rem,calc(100dvh-8rem))] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  compact
                  showTypeBadge={false}
                  onReadChange={handleReadChange}
                  onDelete={handleDelete}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          )}
        </div>

        {showViewAll && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full cursor-pointer"
              render={<Link href="/notifications" onClick={() => setOpen(false)} />}
            >
              View all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
