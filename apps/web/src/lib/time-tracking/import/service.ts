import { prisma } from "@/lib/db";
import type { TimeImportInput } from "@/lib/schemas/time-entry";
import { fetchClockifyTimeEntries } from "@/lib/time-tracking/import/clockify";
import type { NormalizedExternalTimeEntry } from "@/lib/time-tracking/import/types";
import { fetchTogglTimeEntries } from "@/lib/time-tracking/import/toggl";

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function resolveClientId(
  entry: NormalizedExternalTimeEntry,
  clients: Array<{ id: string; name: string }>,
  options: Pick<TimeImportInput, "clientId" | "matchClientsByProject">,
): string | null {
  if (options.clientId) return options.clientId;

  if (options.matchClientsByProject && entry.projectName) {
    const project = normalizeName(entry.projectName);
    const match = clients.find((client) => normalizeName(client.name) === project);
    if (match) return match.id;
  }

  return null;
}

export async function importExternalTimeEntries(
  companyId: string,
  memberId: string,
  input: TimeImportInput,
) {
  const rows =
    input.provider === "toggl"
      ? await fetchTogglTimeEntries(input.apiKey, input.startDate, input.endDate)
      : await fetchClockifyTimeEntries(input.apiKey, input.startDate, input.endDate);

  const [clients, company, existing] = await Promise.all([
    prisma.client.findMany({
      where: { companyId },
      select: { id: true, name: true },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { defaultHourlyRate: true },
    }),
    prisma.timeEntry.findMany({
      where: {
        companyId,
        externalSource: input.provider,
        externalId: { in: rows.map((row) => row.externalId) },
      },
      select: { externalId: true },
    }),
  ]);

  const existingIds = new Set(existing.map((row) => row.externalId));
  const defaultRate = input.fallbackHourlyRate ?? Number(company?.defaultHourlyRate ?? 0);

  let imported = 0;
  let skipped = 0;
  let unmatched = 0;

  for (const row of rows) {
    if (existingIds.has(row.externalId)) {
      skipped += 1;
      continue;
    }

    const clientId = resolveClientId(row, clients, input);
    if (!clientId) {
      unmatched += 1;
      continue;
    }

    const hourlyRate = row.hourlyRate > 0 ? row.hourlyRate : defaultRate;

    await prisma.timeEntry.create({
      data: {
        companyId,
        memberId,
        clientId,
        description: row.projectName
          ? `${row.projectName} — ${row.description}`
          : row.description,
        date: new Date(row.date),
        durationMinutes: row.durationMinutes,
        hourlyRate,
        billable: row.billable,
        externalSource: input.provider,
        externalId: row.externalId,
      },
    });

    imported += 1;
  }

  return {
    imported,
    skipped,
    unmatched,
    total: rows.length,
  };
}
