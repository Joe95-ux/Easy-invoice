import type { LineItemInput } from "@/features/invoices/components/invoice-line-items";
import type { TimeGroupMode } from "@/lib/schemas/time-entry";
import { groupTimeEntries } from "@/lib/time-tracking/grouping";

export type UnbilledTimeEntry = {
  id: string;
  description: string;
  date: string;
  durationMinutes: number;
  hourlyRate: number;
};

function formatApiError(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error: unknown }).error;
    if (typeof error === "string") return error;
    if (error) return fallback;
  }
  return fallback;
}

export async function fetchUnbilledTimeEntries(options: {
  clientId?: string;
  ids?: string[];
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams({ unbilledOnly: "true" });
  if (options.clientId) params.set("clientId", options.clientId);
  if (options.ids?.length) params.set("ids", options.ids.join(","));

  const response = await fetch(`/api/time-entries?${params}`, { signal: options.signal });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("Could not read time entries response");
  }

  if (!response.ok) {
    throw new Error(formatApiError(body, "Failed to load time entries"));
  }

  const entries = (body as { entries?: UnbilledTimeEntry[] }).entries;
  if (!Array.isArray(entries)) {
    throw new Error("Invalid time entries response");
  }

  return entries;
}

export function timeEntriesToLineItems(
  entries: UnbilledTimeEntry[],
  groupBy: TimeGroupMode = "per_task",
): LineItemInput[] {
  const lines = groupTimeEntries(
    entries.map((entry) => ({
      id: entry.id,
      description: entry.description,
      date: new Date(entry.date),
      durationMinutes: entry.durationMinutes,
      hourlyRate: entry.hourlyRate,
    })),
    groupBy,
  );

  return lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    timeEntryIds: line.timeEntryIds,
  }));
}
