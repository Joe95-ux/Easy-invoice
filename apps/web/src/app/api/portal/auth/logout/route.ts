import { NextResponse } from "next/server";
import { destroyPortalSession } from "@/lib/portal/session";

export async function POST() {
  await destroyPortalSession();
  return NextResponse.json({ ok: true });
}
