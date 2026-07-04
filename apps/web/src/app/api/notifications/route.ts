import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NotificationType } from "@easy-invoice/db";
import { requireApiMember } from "@/lib/api/validation";
import {
  deleteReadNotifications,
  getUnreadCount,
  listNotifications,
} from "@/lib/notifications/service";

const NOTIFICATION_TYPES = new Set<string>([
  "CLIENT_VIEWED_INVOICE",
  "CLIENT_VIEWED_ESTIMATE",
  "ESTIMATE_ACCEPTED",
  "ESTIMATE_DECLINED",
  "PAYMENT_RECEIVED",
  "INVOICE_OVERDUE",
  "TEAM_INVITE_RECEIVED",
  "MEMBER_ROLE_CHANGED",
]);

function parseReadFilter(value: string | null): "all" | "read" | "unread" {
  if (value === "read" || value === "unread") return value;
  return "all";
}

export async function GET(request: NextRequest) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const url = request.nextUrl;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limitParam = url.searchParams.get("limit");
  const pageParam = url.searchParams.get("page");
  const pageSizeParam = url.searchParams.get("pageSize");
  const read = parseReadFilter(url.searchParams.get("read"));
  const typeParam = url.searchParams.get("type");
  const type =
    typeParam && NOTIFICATION_TYPES.has(typeParam)
      ? (typeParam as NotificationType)
      : undefined;

  const page = pageParam ? Math.max(1, Number(pageParam)) : undefined;
  const pageSize = pageSizeParam
    ? Math.min(50, Math.max(1, Number(pageSizeParam)))
    : undefined;
  const limit = limitParam ? Math.min(50, Math.max(1, Number(limitParam))) : undefined;

  const [data, unreadCount] = await Promise.all([
    listNotifications(member.id, {
      cursor,
      limit: page ? undefined : limit,
      page,
      pageSize,
      read,
      type,
    }),
    getUnreadCount(member.id),
  ]);

  return NextResponse.json({ ...data, unreadCount });
}

export async function DELETE(request: NextRequest) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const scope = request.nextUrl.searchParams.get("scope");
  if (scope !== "read") {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }

  const result = await deleteReadNotifications(member.id);
  const unreadCount = await getUnreadCount(member.id);

  return NextResponse.json({ ok: true, deletedCount: result.count, unreadCount });
}
