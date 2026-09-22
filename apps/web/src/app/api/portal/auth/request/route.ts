import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPortalMagicLinks } from "@/lib/portal/auth";
import {
  clientIpFromRequest,
  consumeRateLimit,
  rateLimitResponse,
} from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const ipLimit = consumeRateLimit(`portal-auth:ip:${ip}`, {
    windowMs: WINDOW_MS,
    max: 10,
  });
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfterSec);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter a valid email" },
      { status: 400 },
    );
  }

  const emailKey = parsed.data.email.trim().toLowerCase();
  const emailLimit = consumeRateLimit(`portal-auth:email:${emailKey}`, {
    windowMs: WINDOW_MS,
    max: 5,
  });
  if (!emailLimit.ok) return rateLimitResponse(emailLimit.retryAfterSec);

  try {
    const result = await requestPortalMagicLinks(parsed.data.email);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "send failed";
    console.error("[portal auth request]", message);
    return NextResponse.json(
      { error: "Could not send sign-in link. Try again shortly." },
      { status: 502 },
    );
  }
}
