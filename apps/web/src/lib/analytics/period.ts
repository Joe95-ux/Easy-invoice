import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfDay,
  format,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import type { AnalyticsPreset } from "@/features/analytics/types";

export const DEFAULT_ANALYTICS_PRESET: AnalyticsPreset = "7d";

export const ANALYTICS_DATE_PRESETS: {
  value: Exclude<AnalyticsPreset, "custom">;
  label: string;
  days: number;
}[] = [
  { value: "7d", label: "Last 7 Days", days: 7 },
  { value: "30d", label: "Last 30 Days", days: 30 },
  { value: "90d", label: "Last 90 Days", days: 90 },
  { value: "1y", label: "Last Year", days: 365 },
];

export type AnalyticsRangeParams = {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
};

export type ResolvedAnalyticsRange = {
  preset: AnalyticsPreset;
  start: Date;
  end: Date;
  from: string;
  to: string;
  label: string;
  monthCount: number;
};

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  if (!isValid(parsed)) return null;
  return startOfDay(parsed);
}

function rangeForDays(days: number, now = new Date()) {
  const end = endOfDay(now);
  const start = startOfDay(subDays(now, days - 1));
  return { start, end };
}

function formatRangeLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  if (isSameDay(start, end)) {
    return format(start, "MMM d, yyyy");
  }
  if (sameYear) {
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

export function monthCountForRange(start: Date, end: Date): number {
  const count =
    differenceInCalendarMonths(startOfMonth(end), startOfMonth(start)) + 1;
  return Math.min(Math.max(count, 1), 24);
}

export function buildRevenueMonthBucketsForRange(start: Date, end: Date) {
  const monthCount = monthCountForRange(start, end);
  const endMonth = startOfMonth(end);
  return Array.from({ length: monthCount }, (_, index) => {
    const monthDate = startOfMonth(subMonths(endMonth, monthCount - 1 - index));
    return {
      month: format(monthDate, "yyyy-MM"),
      label: format(monthDate, monthCount > 6 ? "MMM yy" : "MMM"),
      collected: 0,
      invoiced: 0,
    };
  });
}

/** Equal-length window ending the day before `start`. */
export function previousAnalyticsRange(start: Date, end: Date) {
  const dayCount = differenceInCalendarDays(startOfDay(end), startOfDay(start)) + 1;
  const prevEnd = endOfDay(subDays(startOfDay(start), 1));
  const prevStart = startOfDay(subDays(prevEnd, dayCount - 1));
  return {
    start: prevStart,
    end: prevEnd,
    label: formatRangeLabel(prevStart, prevEnd),
  };
}

export function buildPeriodDelta(current: number, previous: number) {
  const change = current - previous;
  const changePct =
    previous === 0 ? (current === 0 ? 0 : null) : Math.round((change / previous) * 1000) / 10;
  return { current, previous, change, changePct };
}

function matchesPreset(
  start: Date,
  end: Date,
  days: number,
  now = new Date(),
): boolean {
  const expected = rangeForDays(days, now);
  return (
    isSameDay(start, expected.start) &&
    differenceInCalendarDays(startOfDay(end), startOfDay(expected.end)) === 0
  );
}

export function resolveAnalyticsRange(
  params: AnalyticsRangeParams,
  now = new Date(),
): ResolvedAnalyticsRange {
  const fromDate = parseDateOnly(params.from);
  const toDate = parseDateOnly(params.to);

  if (fromDate && toDate) {
    const start = fromDate <= toDate ? fromDate : toDate;
    const end = endOfDay(fromDate <= toDate ? toDate : fromDate);

    for (const preset of ANALYTICS_DATE_PRESETS) {
      if (matchesPreset(start, end, preset.days, now)) {
        return {
          preset: preset.value,
          start,
          end,
          from: format(start, "yyyy-MM-dd"),
          to: format(end, "yyyy-MM-dd"),
          label: preset.label,
          monthCount: monthCountForRange(start, end),
        };
      }
    }

    return {
      preset: "custom",
      start,
      end,
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
      label: formatRangeLabel(start, end),
      monthCount: monthCountForRange(start, end),
    };
  }

  const presetValue = params.preset;
  const preset =
    ANALYTICS_DATE_PRESETS.find((row) => row.value === presetValue) ??
    ANALYTICS_DATE_PRESETS.find((row) => row.value === DEFAULT_ANALYTICS_PRESET)!;

  const { start, end } = rangeForDays(preset.days, now);
  return {
    preset: preset.value,
    start,
    end,
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
    label: preset.label,
    monthCount: monthCountForRange(start, end),
  };
}

export function analyticsRangeHref(input: {
  preset?: Exclude<AnalyticsPreset, "custom">;
  from?: string;
  to?: string;
}): string {
  const params = new URLSearchParams();
  if (input.from && input.to) {
    params.set("from", input.from);
    params.set("to", input.to);
  } else if (input.preset && input.preset !== DEFAULT_ANALYTICS_PRESET) {
    params.set("preset", input.preset);
  }
  const query = params.toString();
  return query ? `/analytics?${query}` : "/analytics";
}
