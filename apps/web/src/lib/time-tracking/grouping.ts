import type { TimeGroupMode } from "@/lib/schemas/time-entry";
import { formatDate } from "@/lib/invoices";
import { minutesToHours } from "@/lib/time-tracking/format";

export type TimeEntryForGrouping = {
  id: string;
  description: string;
  date: Date;
  durationMinutes: number;
  hourlyRate: number;
};

export type GroupedTimeLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  timeEntryIds: string[];
};

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function groupTimeEntries(
  entries: TimeEntryForGrouping[],
  mode: TimeGroupMode,
): GroupedTimeLineItem[] {
  if (entries.length === 0) return [];

  if (mode === "per_entry") {
    return entries.map((entry) => ({
      description: entry.description,
      quantity: minutesToHours(entry.durationMinutes),
      unitPrice: entry.hourlyRate,
      timeEntryIds: [entry.id],
    }));
  }

  const groups = new Map<string, TimeEntryForGrouping[]>();

  for (const entry of entries) {
    let key: string;
    if (mode === "per_day") {
      key = `${dateKey(entry.date)}::${entry.hourlyRate}`;
    } else {
      key = `${entry.description.trim().toLowerCase()}::${entry.hourlyRate}`;
    }

    const bucket = groups.get(key) ?? [];
    bucket.push(entry);
    groups.set(key, bucket);
  }

  return [...groups.values()].map((bucket) => {
    const totalMinutes = bucket.reduce((sum, entry) => sum + entry.durationMinutes, 0);
    const hourlyRate = bucket[0]!.hourlyRate;

    let description: string;
    if (mode === "per_day") {
      description = `Work — ${formatDate(bucket[0]!.date)}`;
    } else {
      description = bucket[0]!.description;
    }

    return {
      description,
      quantity: minutesToHours(totalMinutes),
      unitPrice: hourlyRate,
      timeEntryIds: bucket.map((entry) => entry.id),
    };
  });
}
