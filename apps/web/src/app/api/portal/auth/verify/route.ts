import { NextResponse } from "next/server";
import { z } from "zod";
import { consumePortalMagicLink } from "@/lib/portal/auth";
import { createPortalSession } from "@/lib/portal/session";

const bodySchema = z.object({
  token: z.string().min(20),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "This sign-in link is invalid or expired" },
      { status: 400 },
    );
  }

  const consumed = await consumePortalMagicLink(parsed.data.token);
  if (!consumed) {
    return NextResponse.json(
      { error: "This sign-in link is invalid or expired" },
      { status: 400 },
    );
  }

  await createPortalSession(consumed.clientId);
  return NextResponse.json({ ok: true, redirectTo: "/portal" });
}
