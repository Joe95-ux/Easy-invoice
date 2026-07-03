import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { listNotifications, getUnreadCount } from "@/lib/notifications/service";

export async function GET(request: NextRequest) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;

  const [data, unreadCount] = await Promise.all([
    listNotifications(member.id, { cursor }),
    getUnreadCount(member.id),
  ]);

  return NextResponse.json({ ...data, unreadCount });
}
