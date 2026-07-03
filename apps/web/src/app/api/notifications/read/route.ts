import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody } from "@/lib/api/validation";
import { markNotificationsRead } from "@/lib/notifications/service";
import { z } from "zod";

const readSchema = z.object({
  ids: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = readSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await markNotificationsRead(member.id, parsed.data.ids);

  return NextResponse.json({ ok: true });
}
