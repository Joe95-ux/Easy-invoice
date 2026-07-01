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
