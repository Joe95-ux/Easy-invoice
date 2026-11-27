import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/app-url";
import { scheduleRetentionBatch, resumeRetentionSends } from "@/lib/retention/dispatch";
import { processRetentionBatch } from "@/lib/retention/service";

export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length);
  try {
    const expected = Buffer.from(secret);
    const provided = Buffer.from(token);
    if (expected.length !== provided.length) return false;
    return timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

/** One batch for a campaign, then chain the next batch. */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let campaignId = "";
  try {
    const body = (await request.json()) as { campaignId?: unknown };
    if (typeof body.campaignId === "string") campaignId = body.campaignId;
  } catch {
    campaignId = "";
  }

  const origin = await getAppOrigin();

  if (!campaignId) {
    const resumed = await resumeRetentionSends(origin);
    return NextResponse.json({ resumed });
  }

  try {
    const result = await processRetentionBatch(campaignId, origin);
    if (!result.done && !result.busy) scheduleRetentionBatch(campaignId, origin);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retention send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Daily backstop for sends whose batch chain stopped. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resumed = await resumeRetentionSends(await getAppOrigin());
    return NextResponse.json({ resumed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Retention send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
