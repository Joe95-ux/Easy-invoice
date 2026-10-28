/** UTC calendar-day helpers for reminder scheduling. */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function utcDayDiff(from: Date, to: Date): number {
  const ms = startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Days from `today` until `dueDate` (positive = before due, negative = overdue). */
export function daysUntilDue(today: Date, dueDate: Date): number {
  return utcDayDiff(today, dueDate);
}

export function addUtcDays(date: Date, days: number): Date {
  const start = startOfUtcDay(date);
  return new Date(start.getTime() + days * 86_400_000);
}

/** Calendar date as YYYY-MM-DD in UTC. */
export function toUtcIsoDate(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

/** Format a UTC calendar day without local-timezone off-by-one (YYYY-MM-DD or Date). */
export function formatUtcDateLabel(date: Date | string): string {
  const iso =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : toUtcIsoDate(typeof date === "string" ? new Date(date) : date);
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
