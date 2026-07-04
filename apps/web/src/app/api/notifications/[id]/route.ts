import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NotificationType } from "@easy-invoice/db";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import {
  deleteNotification,
  getUnreadCount,
  setNotificationRead,
} from "@/lib/notifications/service";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  read: z.boolean(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const updated = await setNotificationRead(member.id, id, parsed.data.read);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const unreadCount = await getUnreadCount(member.id);

  return NextResponse.json({ ok: true, unreadCount });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const deleted = await deleteNotification(member.id, id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const unreadCount = await getUnreadCount(member.id);

  return NextResponse.json({ ok: true, unreadCount });
}
