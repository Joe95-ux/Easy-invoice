"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MailOpenIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_VARIANT,
} from "@/lib/notifications/labels";
import type { NotificationListItem } from "@/lib/notifications/types";
import { formatDateTime } from "@/lib/invoices";
import { cn } from "@/lib/utils";

type NotificationRowProps = {
  notification: NotificationListItem;
  compact?: boolean;
  showTypeBadge?: boolean;
  onReadChange?: (id: string, read: boolean) => void;
  onDelete?: (id: string) => void;
  onNavigate?: () => void;
};

export function NotificationRow({
  notification,
  compact = false,
  showTypeBadge = true,
  onReadChange,
  onDelete,
  onNavigate,
}: NotificationRowProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setRead(read: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
      if (!res.ok) throw new Error();
      onReadChange?.(notification.id, read);
    } catch {
      toast.error("Could not update notification");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/notifications/${notification.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      onDelete?.(notification.id);
    } catch {
      toast.error("Could not delete notification");
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen() {
    if (!notification.read) {
      await setRead(true);
    }
    onNavigate?.();
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  }

  return (
    <div
      className={cn(
        "group flex gap-2 px-3 py-3 transition-colors sm:gap-3 sm:px-4",
        !notification.read ? "bg-primary/5" : "hover:bg-muted/40",
      )}
    >
      {!notification.read && (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {showTypeBadge && (
            <Badge variant={NOTIFICATION_TYPE_VARIANT[notification.type]} className="text-xs">
              {NOTIFICATION_TYPE_LABELS[notification.type]}
            </Badge>
          )}
          {notification.linkUrl ? (
            <button
              type="button"
              onClick={() => void handleOpen()}
              className="cursor-pointer text-left text-sm font-medium leading-tight text-foreground hover:underline"
            >
              {notification.title}
            </button>
          ) : (
            <p className="text-sm font-medium leading-tight">{notification.title}</p>
          )}
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground">{notification.body}</p>
        )}
        <p className="text-[11px] text-muted-foreground/70">
          {formatDateTime(notification.createdAt)}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:data-popup-open:opacity-100"
              aria-label="Notification actions"
              disabled={busy}
            />
          }
        >
          {busy ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <MoreHorizontalIcon className="size-4" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {notification.read ? (
            <DropdownMenuItem onClick={() => void setRead(false)}>
              <MailOpenIcon className="size-4" />
              Mark unread
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => void setRead(true)}>
              <CheckIcon className="size-4" />
              Mark read
            </DropdownMenuItem>
          )}
          {notification.linkUrl && (
            <DropdownMenuItem render={<Link href={notification.linkUrl} onClick={onNavigate} />}>
              <ExternalLinkIcon className="size-4" />
              Open
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => void handleDelete()}>
            <Trash2Icon className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
