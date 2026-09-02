import { prisma } from "@/lib/db";
import type { StartTimeTimerInput, UpdateTimeTimerInput } from "@/lib/schemas/time-timer";
import { hoursToMinutes, minutesToHours, roundElapsedMinutes } from "@/lib/time-tracking/format";
import { resolveHourlyRate } from "@/lib/time-tracking/resolve-hourly-rate";

const timerInclude = {
  client: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
};

async function resolveTimerProject(
  companyId: string,
  projectId: string | null | undefined,
  clientId: string | null | undefined,
) {
  if (!projectId) {
    return { projectId: null as string | null, clientId: clientId || null };
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true, clientId: true },
  });
  if (!project) throw new Error("Project not found");

  return {
    projectId: project.id,
    clientId: clientId || project.clientId || null,
  };
}

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

  const resolved = await resolveTimerProject(companyId, input.projectId, input.clientId);

  if (resolved.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: resolved.clientId, companyId },
      select: { id: true },
    });
    if (!client) throw new Error("Client not found");
  }

  const hourlyRate = await resolveHourlyRate(companyId, {
    clientId: resolved.clientId,
    explicitRate: input.hourlyRate,
  });

  return prisma.activeTimeTimer.create({
    data: {
      companyId,
      memberId,
      clientId: resolved.clientId,
      projectId: resolved.projectId,
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

  const nextClientId =
    input.clientId !== undefined ? input.clientId || null : timer.clientId;
  const nextProjectId =
    input.projectId !== undefined ? input.projectId || null : timer.projectId;
  const resolved = await resolveTimerProject(companyId, nextProjectId, nextClientId);

  if (resolved.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: resolved.clientId, companyId },
      select: { id: true },
    });
    if (!client) throw new Error("Client not found");
  }

  return prisma.activeTimeTimer.update({
    where: { id: timer.id },
    data: {
      ...(input.clientId !== undefined || input.projectId !== undefined
        ? { clientId: resolved.clientId, projectId: resolved.projectId }
        : {}),
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
        projectId: timer.projectId,
        description: timer.description,
        date: new Date(date),
        durationMinutes: hoursToMinutes(hours),
        hourlyRate: timer.hourlyRate,
        billable: timer.billable,
      },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
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
    projectId: timer.projectId,
    projectName: timer.project?.name ?? null,
    description: timer.description,
    startedAt: timer.startedAt.toISOString(),
    billable: timer.billable,
    hourlyRate: Number(timer.hourlyRate),
  };
}
