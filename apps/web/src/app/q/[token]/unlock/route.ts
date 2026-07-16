import { NextResponse } from "next/server";
import { getQrCodeByToken } from "@/lib/qr-codes/service";
import {
  qrUnlockCookieName,
  qrUnlockToken,
  verifyQrPassword,
} from "@/lib/qr-codes/password";

type RouteContext = { params: Promise<{ token: string }> };

const UNLOCK_MAX_AGE = 60 * 60 * 12; // 12 hours

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;

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

  if (!verifyQrPassword(password, qr.passwordHash)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(qrUnlockCookieName(qr.id), qrUnlockToken(qr.passwordHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/q/${token}`,
    maxAge: UNLOCK_MAX_AGE,
  });
  return response;
}
