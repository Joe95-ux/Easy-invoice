import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { serializeTimeEntry } from "@/lib/time-tracking/service";
import { stopActiveTimerAndLogEntry } from "@/lib/time-tracking/timer-service";

export async function POST() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const company = await prisma.company.findUnique({
    where: { id: member.companyId },
    select: { timerRoundToMinutes: true },
  });

  try {
    const { entry, durationMinutes } = await stopActiveTimerAndLogEntry(
      member.companyId,
      member.id,
      company?.timerRoundToMinutes ?? 1,
    );
    return NextResponse.json({
      entry: serializeTimeEntry(entry),
      durationMinutes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to stop timer";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
