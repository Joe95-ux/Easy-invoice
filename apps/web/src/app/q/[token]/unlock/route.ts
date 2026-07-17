import { NextResponse } from "next/server";
import { getQrCodeByToken } from "@/lib/qr-codes/service";
import {
  qrUnlockCookieName,
  qrUnlockToken,
  verifyQrPassword,
} from "@/lib/qr-codes/password";
import {
  clearUnlockAttempts,
  consumeUnlockAttempt,
  unlockRateLimitKey,
} from "@/lib/qr-codes/rate-limit";

type RouteContext = { params: Promise<{ token: string }> };

const UNLOCK_MAX_AGE = 60 * 60 * 12; // 12 hours

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const ip = clientIp(request);
  const limitKey = unlockRateLimitKey(token, ip);
  const limit = consumeUnlockAttempt(limitKey);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    password = "";
  }

  const qr = await getQrCodeByToken(token);
  if (!qr || qr.status !== "ACTIVE" || !qr.passwordHash) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await verifyQrPassword(password, qr.passwordHash))) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  clearUnlockAttempts(limitKey);

  const response = NextResponse.json({ success: true });
  response.cookies.set(qrUnlockCookieName(qr.id), qrUnlockToken(qr.id, qr.passwordHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/q/${token}`,
    maxAge: UNLOCK_MAX_AGE,
  });
  return response;
}
