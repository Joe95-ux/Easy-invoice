import { prisma } from "@/lib/db";
import { minutesToHours } from "@/lib/time-tracking/format";

export type UnbilledTimeStats = {
  entryCount: number;
  totalHours: number;
  totalValue: number;
  clientCount: number;
};

export type UnbilledTimePreview = {
  id: string;
  description: string;
  date: string;
  hours: number;
  value: number;
  clientId: string | null;
  clientName: string | null;
  invoiceHref: string | null;
};

function buildStats(
  entries: Array<{
    durationMinutes: number;
    hourlyRate: { toString(): string } | number;
    clientId: string | null;
  }>,
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

/** Recent unbilled billable entries for dashboard attention previews. */
export async function getUnbilledTimePreviews(
  companyId: string,
  take = 5,
): Promise<UnbilledTimePreview[]> {
  const entries = await prisma.timeEntry.findMany({
    where: {
      companyId,
      invoicedAt: null,
      billable: true,
    },
    select: {
      id: true,
      description: true,
      date: true,
      durationMinutes: true,
      hourlyRate: true,
      clientId: true,
      client: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
  });

  return entries.map((entry) => {
    const hours = minutesToHours(entry.durationMinutes);
    const rate = Number(entry.hourlyRate);
    const value = Math.round(hours * rate * 100) / 100;
    const params = new URLSearchParams({
      addTime: "1",
      timeEntryIds: entry.id,
    });
    if (entry.clientId) params.set("clientId", entry.clientId);

    return {
      id: entry.id,
      description: entry.description || "Time entry",
      date: entry.date.toISOString().slice(0, 10),
      hours,
      value,
      clientId: entry.clientId,
      clientName: entry.client?.name ?? null,
      invoiceHref: entry.clientId ? `/invoices/new?${params.toString()}` : null,
    };
  });
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
