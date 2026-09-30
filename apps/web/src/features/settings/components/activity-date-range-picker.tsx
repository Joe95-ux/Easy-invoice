"use client";

import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { format, parseISO, subDays, startOfDay, endOfDay, isSameDay } from "date-fns";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ActivityDatePreset = "7d" | "30d" | "90d" | "1y" | "all" | "custom";

export type ActivityDateRangeValue = {
  preset: ActivityDatePreset;
  from: string | null;
  to: string | null;
  label: string;
};

const PRESETS: { value: Exclude<ActivityDatePreset, "custom">; label: string; days?: number }[] = [
  { value: "7d", label: "Last 7 Days", days: 7 },
  { value: "30d", label: "Last 30 Days", days: 30 },
  { value: "90d", label: "Last 90 Days", days: 90 },
  { value: "1y", label: "Last Year", days: 365 },
  { value: "all", label: "All time" },
];

const DAY_PRESET_DAYS: Record<"7d" | "30d" | "90d" | "1y", number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

function formatRangeLabel(start: Date, end: Date): string {
  if (isSameDay(start, end)) return format(start, "MMM d, yyyy");
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

export function resolveActivityDateRange(
  preset: ActivityDatePreset,
  from?: string | null,
  to?: string | null,
): ActivityDateRangeValue {
  if (preset === "all") {
    return { preset: "all", from: null, to: null, label: "All time" };
  }
  if (preset === "custom" && from && to) {
    const start = startOfDay(parseISO(from));
    const end = endOfDay(parseISO(to));
    return {
      preset: "custom",
      from,
      to,
      label: formatRangeLabel(start, end),
    };
  }
  const resolvedPreset =
    preset === "7d" || preset === "30d" || preset === "90d" || preset === "1y"
      ? preset
      : "30d";
  const days = DAY_PRESET_DAYS[resolvedPreset];
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(end, days - 1));
  return {
    preset: resolvedPreset,
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
    label: formatRangeLabel(start, end),
  };
}

export const DEFAULT_ACTIVITY_DATE_RANGE = resolveActivityDateRange("30d");

type ActivityDateRangePickerProps = {
  value: ActivityDateRangeValue;
  onChange: (next: ActivityDateRangeValue) => void;
  className?: string;
};

export function ActivityDateRangePicker({
  value,
  onChange,
  className,
}: ActivityDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<ActivityDatePreset>(value.preset);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() =>
    value.from && value.to
      ? { from: parseISO(value.from), to: parseISO(value.to) }
      : undefined,
  );
  const [pickingEnd, setPickingEnd] = useState(false);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    setActivePreset(value.preset);
    setDraftRange(
      value.from && value.to
        ? { from: parseISO(value.from), to: parseISO(value.to) }
        : undefined,
    );
    setPickingEnd(false);
  }, [value.preset, value.from, value.to]);

  function applyPreset(next: Exclude<ActivityDatePreset, "custom">) {
    setActivePreset(next);
    setPickingEnd(false);
    setOpen(false);
    onChange(resolveActivityDateRange(next));
  }

  function applyCustom(range: { from: Date; to: Date }) {
    const start = range.from <= range.to ? range.from : range.to;
    const end = range.from <= range.to ? range.to : range.from;
    const next = resolveActivityDateRange(
      "custom",
      format(start, "yyyy-MM-dd"),
      format(end, "yyyy-MM-dd"),
    );
    setActivePreset("custom");
    setPickingEnd(false);
    setOpen(false);
    onChange(next);
  }

  function handlePresetClick(next: ActivityDatePreset) {
    if (next === "custom") {
      setActivePreset("custom");
      setPickingEnd(false);
      return;
    }
    applyPreset(next);
  }

  function handleRangeSelect(range: DateRange | undefined) {
    setActivePreset("custom");
    if (!range?.from) {
      setDraftRange(undefined);
      setPickingEnd(false);
      return;
    }
    if (!pickingEnd || !range.to) {
      setDraftRange({ from: range.from, to: undefined });
      setPickingEnd(true);
      return;
    }
    setDraftRange(range);
    applyCustom({ from: range.from, to: range.to });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPickingEnd(false);
          setActivePreset(value.preset);
          setDraftRange(
            value.from && value.to
              ? { from: parseISO(value.from), to: parseISO(value.to) }
              : undefined,
          );
        }
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              className,
            )}
            aria-label={`Date range: ${value.label}`}
          />
        }
      >
        <span>
          Date: <span className="text-foreground">{value.label}</span>
        </span>
        {open ? (
          <ChevronUpIcon className="size-4 shrink-0 opacity-70" />
        ) : (
          <ChevronDownIcon className="size-4 shrink-0 opacity-70" />
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-[min(100vw-1.5rem,36rem)] gap-0 overflow-hidden p-0 sm:w-auto"
      >
        <div className="flex flex-col sm:flex-row">
          <div className="border-b border-border p-2 sm:w-44 sm:shrink-0 sm:border-r sm:border-b-0">
            <div className="no-scrollbar flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
              {PRESETS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handlePresetClick(option.value)}
                  className={cn(
                    "shrink-0 cursor-pointer rounded-md px-3 py-2 text-left text-sm whitespace-nowrap transition-colors",
                    activePreset === option.value
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePresetClick("custom")}
                className={cn(
                  "shrink-0 cursor-pointer rounded-md px-3 py-2 text-left text-sm whitespace-nowrap transition-colors",
                  activePreset === "custom"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                Custom Range
              </button>
            </div>
          </div>

          <div className="w-full p-3 sm:w-auto">
            <div className="w-full rounded-lg bg-muted/40 p-2">
              <Calendar
                mode="range"
                numberOfMonths={1}
                selected={draftRange}
                onSelect={handleRangeSelect}
                defaultMonth={draftRange?.to ?? draftRange?.from ?? today}
                disabled={{ after: today }}
                className="w-full bg-transparent p-0 sm:w-fit"
                classNames={{
                  root: "w-full sm:w-fit",
                }}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
