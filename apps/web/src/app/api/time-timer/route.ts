import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { startTimeTimerSchema, updateTimeTimerSchema } from "@/lib/schemas/time-timer";
import {
  discardActiveTimer,
  getActiveTimerForMember,
  serializeActiveTimer,
  startActiveTimer,
  updateActiveTimer,
} from "@/lib/time-tracking/timer-service";
import { getRecentTimeDescriptions } from "@/lib/time-tracking/service";

async function getCompanyDefaults(companyId: string) {
  return prisma.company.findUnique({
    where: { id: companyId },
    select: { defaultHourlyRate: true, currency: true, timerRoundToMinutes: true },
  });
}

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const [timer, company, recentDescriptions] = await Promise.all([
    getActiveTimerForMember(member.companyId, member.id),
    getCompanyDefaults(member.companyId),
    getRecentTimeDescriptions(member.companyId),
  ]);

  return NextResponse.json({
    timer: timer ? serializeActiveTimer(timer) : null,
    defaultHourlyRate: company?.defaultHourlyRate ? Number(company.defaultHourlyRate) : null,
    currency: company?.currency ?? "USD",
    timerRoundToMinutes: company?.timerRoundToMinutes ?? 1,
    recentDescriptions,
  });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = startTimeTimerSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const timer = await startActiveTimer(member.companyId, member.id, parsed.data);
    return NextResponse.json({ timer: serializeActiveTimer(timer) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start timer";
    const status = message.includes("already running") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = updateTimeTimerSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const timer = await updateActiveTimer(member.companyId, member.id, parsed.data);
    return NextResponse.json({ timer: serializeActiveTimer(timer) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update timer";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  await discardActiveTimer(member.companyId, member.id);
  return NextResponse.json({ ok: true });
}
