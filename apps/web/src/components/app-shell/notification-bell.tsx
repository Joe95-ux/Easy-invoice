"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import {
  BellIcon,
  CheckCheckIcon,
  Loader2Icon,
  Maximize2Icon,
  SettingsIcon,
} from "lucide-react";
import Pusher from "pusher-js";
import { toast } from "sonner";
import { NotificationRow } from "@/features/notifications/components/notification-row";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { NotificationListItem } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

const DROPDOWN_LIMIT = 10;
const DRAWER_LIMIT = 50;
const EXPAND_THRESHOLD = 10;
const TALL_LIST_THRESHOLD = 7;

type NotificationBellProps = {
  memberId: string;
};

export function NotificationBell({ memberId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [morphing, setMorphing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async (limit: number) => {
    const params = new URLSearchParams({ limit: String(limit) });
    const res = await fetch(`/api/notifications?${params.toString()}`);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Could not load notifications");
    }

    const data = (await res.json()) as {
      notifications: NotificationListItem[];
      totalCount: number;
      unreadCount: number;
    };

    setNotifications(data.notifications);
    setTotalCount(data.totalCount);
    setUnreadCount(data.unreadCount);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await fetchNotifications(DROPDOWN_LIMIT);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load notifications");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchNotifications, memberId]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    let pusher: Pusher | null = null;
    try {
      pusher = new Pusher(key, {
        cluster,
        channelAuthorization: {
          endpoint: "/api/pusher/auth",
          transport: "ajax",
        },
      });

      const channel = pusher.subscribe(`private-member-${memberId}`);
      channel.bind("notification", (data: NotificationListItem) => {
        setNotifications((prev) => {
          const next = [data, ...prev.filter((n) => n.id !== data.id)];
          return next.slice(0, drawerOpen ? DRAWER_LIMIT : DROPDOWN_LIMIT);
        });
        setTotalCount((count) => count + 1);
        setUnreadCount((count) => count + 1);
        toast(data.title, { description: data.body });
      });
    } catch {
      // Realtime is optional — list fetch still works.
    }

    return () => {
      try {
        pusher?.unsubscribe(`private-member-${memberId}`);
        pusher?.disconnect();
      } catch {
        // ignore
      }
    };
  }, [drawerOpen, memberId]);

  async function refreshPanel(isOpen: boolean, limit = DROPDOWN_LIMIT) {
    if (!isOpen) return;
    setLoading(true);
    try {
      await fetchNotifications(limit);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load notifications";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function handlePopoverOpenChange(isOpen: boolean) {
    if (morphing && !isOpen) {
      setOpen(false);
      return;
    }
    if (drawerOpen && isOpen) return;
    setOpen(isOpen);
    if (isOpen) void refreshPanel(true, DROPDOWN_LIMIT);
  }

  function handleDrawerOpenChange(isOpen: boolean) {
    setDrawerOpen(isOpen);
    if (!isOpen) {
      setMorphing(false);
      // Trim back to dropdown-sized list when leaving the drawer.
      setNotifications((prev) => prev.slice(0, DROPDOWN_LIMIT));
    }
  }

  function expandToDrawer() {
    if (morphing || drawerOpen) return;
    setMorphing(true);

    const handoff = () => {
      flushSync(() => {
        setOpen(false);
        setDrawerOpen(true);
      });
      void refreshPanel(true, DRAWER_LIMIT).finally(() => {
        setMorphing(false);
      });
    };

    const doc = document as Document & {
      startViewTransition?: (update: () => void) => unknown;
    };

    // Continuous popover→drawer morph when the browser supports View Transitions.
    if (typeof doc.startViewTransition === "function") {
      try {
        doc.startViewTransition(handoff);
        return;
      } catch {
        // Fall through to timed handoff.
      }
    }

    // Timed exit: popover scales/fades out, then the right drawer slides in.
    window.setTimeout(handoff, 160);
  }

  async function handleMarkAllRead() {
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

  function closeSurfaces() {
    setOpen(false);
    setDrawerOpen(false);
    setMorphing(false);
  }

  const showViewAll = totalCount > DROPDOWN_LIMIT;
  const showExpand = totalCount > EXPAND_THRESHOLD;
  const tallList = notifications.length > TALL_LIST_THRESHOLD;
  const listMaxHeightClass = tallList
    ? "max-h-[min(32rem,calc(100dvh-8rem))]"
    : "max-h-[min(22rem,calc(100dvh-8rem))]";

  const headerActions = (
    <div className="flex items-center gap-1">
      {showExpand && !drawerOpen ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer"
          onClick={expandToDrawer}
          aria-label="Expand notifications"
          title="Expand"
        >
          <Maximize2Icon className="size-4" />
        </Button>
      ) : null}
      {unreadCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="cursor-pointer"
          onClick={() => void handleMarkAllRead()}
          aria-label="Mark all read"
          title="Mark all read"
        >
          <CheckCheckIcon className="size-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        className="cursor-pointer"
        render={<Link href="/settings/notifications" onClick={closeSurfaces} />}
        aria-label="Notification settings"
        title="Settings"
      >
        <SettingsIcon className="size-4" />
      </Button>
    </div>
  );

  const listBody = (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="space-y-3 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() =>
              void refreshPanel(true, drawerOpen ? DRAWER_LIMIT : DROPDOWN_LIMIT)
            }
          >
            Try again
          </Button>
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
              onNavigate={closeSurfaces}
            />
          ))}
        </div>
      )}
    </>
  );

  const viewAllFooter = showViewAll && !error ? (
    <Button
      variant="ghost"
      size="sm"
      className="w-full cursor-pointer"
      render={<Link href="/notifications" onClick={closeSurfaces} />}
    >
      View all
    </Button>
  ) : null;

  return (
    <>
      <Popover open={open} onOpenChange={handlePopoverOpenChange}>
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
          className={cn(
            "w-[min(calc(100vw-2rem),24rem)] gap-0 overflow-hidden p-0 sm:w-96",
            "origin-top-right transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "[view-transition-name:notification-panel]",
            morphing &&
              "pointer-events-none translate-x-2 scale-[0.96] opacity-0",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {headerActions}
          </div>

          <div
            className={cn(
              "overflow-y-auto transition-[max-height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              listMaxHeightClass,
            )}
          >
            {listBody}
          </div>

          {viewAllFooter ? (
            <div className="border-t border-border p-2">{viewAllFooter}</div>
          ) : null}
        </PopoverContent>
      </Popover>

      <Drawer
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        direction="right"
        shouldScaleBackground={false}
      >
        <DrawerContent
          className={cn(
            "flex h-full max-h-dvh flex-col data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md",
            "data-[vaul-drawer-direction=right]:duration-300 data-[vaul-drawer-direction=right]:ease-[cubic-bezier(0.22,1,0.36,1)]",
            "[view-transition-name:notification-panel]",
          )}
        >
          <DrawerHeader className="border-b border-border text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DrawerTitle>Notifications</DrawerTitle>
                <DrawerDescription>
                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : "You're all caught up"}
                </DrawerDescription>
              </div>
              {headerActions}
            </div>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">{listBody}</div>

          {viewAllFooter ? (
            <DrawerFooter className="border-t border-border">{viewAllFooter}</DrawerFooter>
          ) : null}
        </DrawerContent>
      </Drawer>
    </>
  );
}
