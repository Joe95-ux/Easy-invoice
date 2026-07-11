import { prisma } from "@/lib/db";
import { minutesToHours } from "@/lib/time-tracking/format";

export type UnbilledTimeStats = {
  entryCount: number;
  totalHours: number;
  totalValue: number;
  clientCount: number;
};

function buildStats(
  entries: Array<{ durationMinutes: number; hourlyRate: { toString(): string } | number; clientId: string | null }>,
): UnbilledTimeStats {
  let totalHours = 0;
  let totalValue = 0;
  const clients = new Set<string>();

  for (const entry of entries) {
    const hours = minutesToHours(entry.durationMinutes);
    const rate = Number(entry.hourlyRate);
    totalHours += hours;
    totalValue += hours * rate;
    if (entry.clientId) clients.add(entry.clientId);
  }

  return {
    entryCount: entries.length,
    totalHours: Math.round(totalHours * 100) / 100,
    totalValue: Math.round(totalValue * 100) / 100,
    clientCount: clients.size,
  };
}

export async function getCompanyUnbilledTimeStats(companyId: string): Promise<UnbilledTimeStats> {
  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      invoicedAt: null,
      billable: true,
    },
    select: {
      durationMinutes: true,
      hourlyRate: true,
      clientId: true,
    },
  });

  return buildStats(entries);
}

export async function getClientUnbilledTimeStats(
  companyId: string,
  clientId: string,
): Promise<UnbilledTimeStats> {
  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      clientId,
      invoicedAt: null,
      billable: true,
    },
    select: {
      durationMinutes: true,
      hourlyRate: true,
      clientId: true,
    },
  });

  return buildStats(entries);
}
