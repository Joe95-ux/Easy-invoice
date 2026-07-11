import { prisma } from "@/lib/db";
import type { StartTimeTimerInput, UpdateTimeTimerInput } from "@/lib/schemas/time-timer";
import { hoursToMinutes, minutesToHours, roundElapsedMinutes } from "@/lib/time-tracking/format";
import { resolveHourlyRate } from "@/lib/time-tracking/resolve-hourly-rate";

const timerInclude = {
  client: { select: { id: true, name: true } },
} as const;

export async function getActiveTimerForMember(companyId: string, memberId: string) {
  return prisma.activeTimeTimer.findFirst({
    where: { companyId, memberId },
    include: timerInclude,
  });
}

export async function startActiveTimer(
  companyId: string,
  memberId: string,
  input: StartTimeTimerInput,
) {
  const existing = await getActiveTimerForMember(companyId, memberId);
  if (existing) {
    throw new Error("A timer is already running");
  }

  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, companyId },
      select: { id: true },
    });
    if (!client) throw new Error("Client not found");
  }

  const hourlyRate = await resolveHourlyRate(companyId, {
    clientId: input.clientId,
    explicitRate: input.hourlyRate,
  });

  return prisma.activeTimeTimer.create({
    data: {
      companyId,
      memberId,
      clientId: input.clientId || null,
      description: input.description.trim(),
      startedAt: new Date(),
      billable: input.billable,
      hourlyRate,
    },
    include: timerInclude,
  });
}

export async function updateActiveTimer(
  companyId: string,
  memberId: string,
  input: UpdateTimeTimerInput,
) {
  const timer = await getActiveTimerForMember(companyId, memberId);
  if (!timer) throw new Error("No active timer");

  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, companyId },
      select: { id: true },
    });
    if (!client) throw new Error("Client not found");
  }

  return prisma.activeTimeTimer.update({
    where: { id: timer.id },
    data: {
      ...(input.clientId !== undefined && { clientId: input.clientId || null }),
      ...(input.description !== undefined && { description: input.description.trim() }),
      ...(input.billable !== undefined && { billable: input.billable }),
      ...(input.hourlyRate !== undefined && { hourlyRate: input.hourlyRate }),
    },
    include: timerInclude,
  });
}

export async function discardActiveTimer(companyId: string, memberId: string) {
  const timer = await getActiveTimerForMember(companyId, memberId);
  if (!timer) return null;

  await prisma.activeTimeTimer.delete({ where: { id: timer.id } });
  return timer;
}

function elapsedMinutesFromStart(startedAt: Date, roundToMinutes = 1): number {
  const elapsedMs = Date.now() - startedAt.getTime();
  return roundElapsedMinutes(elapsedMs, roundToMinutes);
}

export async function stopActiveTimerAndLogEntry(
  companyId: string,
  memberId: string,
  roundToMinutes = 1,
) {
  const timer = await getActiveTimerForMember(companyId, memberId);
  if (!timer) throw new Error("No active timer");

  const durationMinutes = elapsedMinutesFromStart(timer.startedAt, roundToMinutes);
  const hours = minutesToHours(durationMinutes);
  const date = timer.startedAt.toISOString().slice(0, 10);

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.timeEntry.create({
      data: {
        companyId,
        memberId,
        clientId: timer.clientId,
        description: timer.description,
        date: new Date(date),
        durationMinutes: hoursToMinutes(hours),
        hourlyRate: timer.hourlyRate,
        billable: timer.billable,
      },
      include: {
        client: { select: { id: true, name: true } },
        invoice: { select: { id: true, number: true } },
        member: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.activeTimeTimer.delete({ where: { id: timer.id } });
    return created;
  });

  return { entry, durationMinutes };
}

export function serializeActiveTimer(
  timer: NonNullable<Awaited<ReturnType<typeof getActiveTimerForMember>>>,
) {
  return {
    id: timer.id,
    clientId: timer.clientId,
    clientName: timer.client?.name ?? null,
    description: timer.description,
    startedAt: timer.startedAt.toISOString(),
    billable: timer.billable,
    hourlyRate: Number(timer.hourlyRate),
  };
}
