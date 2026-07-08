import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { serializeTimeEntry } from "@/lib/time-tracking/service";
import { stopActiveTimerAndLogEntry } from "@/lib/time-tracking/timer-service";

export async function POST() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  try {
    const { entry, durationMinutes } = await stopActiveTimerAndLogEntry(
      member.companyId,
      member.id,
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
