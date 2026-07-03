"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BellIcon,
  CheckCheckIcon,
  Loader2Icon,
  SettingsIcon,
} from "lucide-react";
import Pusher from "pusher-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { NotificationListItem } from "@/lib/notifications/types";
import { formatDateTime } from "@/lib/invoices";

type NotificationBellProps = {
  memberId: string;
};

export function NotificationBell({ memberId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasFetched = useRef(false);

  const fetchNotifications = useCallback(async (nextCursor?: string) => {
    const params = new URLSearchParams();
    if (nextCursor) params.set("cursor", nextCursor);

    const res = await fetch(`/api/notifications?${params.toString()}`);
    if (!res.ok) return;

    const data = (await res.json()) as {
      notifications: NotificationListItem[];
      nextCursor: string | null;
      unreadCount: number;
    };

    if (nextCursor) {
      setNotifications((prev) => [...prev, ...data.notifications]);
    } else {
      setNotifications(data.notifications);
    }
    setCursor(data.nextCursor);
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
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((c) => c + 1);
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
    if (isOpen && !hasFetched.current) {
      hasFetched.current = true;
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

  async function handleLoadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    await fetchNotifications(cursor);
    setLoadingMore(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Notifications" />
        }
      >
        <div className="relative">
          <BellIcon className="size-4" />
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
        className="w-80 p-0 sm:w-96"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => void handleMarkAllRead()}
                aria-label="Mark all read"
              >
                <CheckCheckIcon className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              render={<Link href="/settings/notifications" />}
              aria-label="Notification settings"
            >
              <SettingsIcon className="size-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            <>
              {notifications.map((n) => (
                <NotificationRow key={n.id} notification={n} onClose={() => setOpen(false)} />
              ))}
              {cursor && (
                <div className="flex justify-center border-t border-border py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
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
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  notification,
  onClose,
}: {
  notification: NotificationListItem;
  onClose: () => void;
}) {
  const content = (
    <div
      className={`flex gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
        !notification.read ? "bg-primary/5" : ""
      }`}
    >
      {!notification.read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-medium leading-tight">{notification.title}</p>
        <p className="text-xs text-muted-foreground">{notification.body}</p>
        <p className="text-[11px] text-muted-foreground/70">
          {formatDateTime(notification.createdAt)}
        </p>
      </div>
    </div>
  );

  if (notification.linkUrl) {
    return (
      <Link href={notification.linkUrl} onClick={onClose} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
