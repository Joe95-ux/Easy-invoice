import {
  endOfDay,
  format,
  getMonth,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import type { AnalyticsPeriod } from "@/features/analytics/types";

export const ANALYTICS_PERIODS: {
  value: AnalyticsPeriod;
  label: string;
  shortLabel: string;
}[] = [
  { value: "3m", label: "Last 3 months", shortLabel: "3 mo" },
  { value: "6m", label: "Last 6 months", shortLabel: "6 mo" },
  { value: "12m", label: "Last 12 months", shortLabel: "12 mo" },
  { value: "ytd", label: "Year to date", shortLabel: "YTD" },
  { value: "all", label: "All time", shortLabel: "All" },
];

export const DEFAULT_ANALYTICS_PERIOD: AnalyticsPeriod = "6m";

export function parseAnalyticsPeriod(value: string | null | undefined): AnalyticsPeriod {
  if (value === "3m" || value === "6m" || value === "12m" || value === "ytd" || value === "all") {
    return value;
  }
  return DEFAULT_ANALYTICS_PERIOD;
}

export type ResolvedAnalyticsPeriod = {
  period: AnalyticsPeriod;
  /** Inclusive lower bound for payment / invoice issue filters. Null = all time. */
  start: Date | null;
  end: Date;
  /** Number of month buckets for the revenue chart. */
  monthCount: number;
  label: string;
};

export function resolveAnalyticsPeriod(
  period: AnalyticsPeriod,
  now = new Date(),
): ResolvedAnalyticsPeriod {
  const end = endOfDay(now);

  switch (period) {
    case "3m":
      return {
        period,
        start: startOfMonth(subMonths(now, 2)),
        end,
        monthCount: 3,
        label: "Last 3 months",
      };
    case "6m":
      return {
        period,
        start: startOfMonth(subMonths(now, 5)),
        end,
        monthCount: 6,
        label: "Last 6 months",
      };
    case "12m":
      return {
        period,
        start: startOfMonth(subMonths(now, 11)),
        end,
        monthCount: 12,
        label: "Last 12 months",
      };
    case "ytd": {
      const months = getMonth(now) + 1;
      return {
        period,
        start: startOfYear(now),
        end,
        monthCount: months,
        label: `Year to date (${format(now, "yyyy")})`,
      };
    }
    case "all":
      return {
        period,
        start: null,
        end,
        // Chart stays readable; totals still use all-time payments.
        monthCount: 12,
        label: "All time",
      };
  }
}

export function buildRevenueMonthBuckets(monthCount: number, now = new Date()) {
  return Array.from({ length: monthCount }, (_, index) => {
    const monthDate = startOfMonth(subMonths(now, monthCount - 1 - index));
    return {
      month: format(monthDate, "yyyy-MM"),
      label: format(monthDate, monthCount > 6 ? "MMM yy" : "MMM"),
      amount: 0,
    };
  });
}
