"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AnalyticsPreset } from "@/features/analytics/types";
import {
  ANALYTICS_DATE_PRESETS,
  analyticsRangeHref,
} from "@/lib/analytics/period";
import { cn } from "@/lib/utils";

type AnalyticsDateRangePickerProps = {
  preset: AnalyticsPreset;
  from: string;
  to: string;
  label: string;
};

export function AnalyticsDateRangePicker({
  preset,
  from,
  to,
  label,
}: AnalyticsDateRangePickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<AnalyticsPreset>(preset);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() =>
    parseDraftRange(from, to),
  );
  const [pickingEnd, setPickingEnd] = useState(false);

  useEffect(() => {
    setActivePreset(preset);
    setDraftRange(parseDraftRange(from, to));
    setPickingEnd(false);
  }, [preset, from, to]);

  const today = useMemo(() => new Date(), []);

  function navigateToPreset(next: Exclude<AnalyticsPreset, "custom">) {
    setActivePreset(next);
    setPickingEnd(false);
    setOpen(false);
    router.push(analyticsRangeHref({ preset: next }));
  }

  function navigateToCustom(range: { from: Date; to: Date }) {
    const start = range.from <= range.to ? range.from : range.to;
    const end = range.from <= range.to ? range.to : range.from;
    setActivePreset("custom");
    setPickingEnd(false);
    setOpen(false);
    router.push(
      analyticsRangeHref({
        from: format(start, "yyyy-MM-dd"),
        to: format(end, "yyyy-MM-dd"),
      }),
    );
  }

  function handlePresetClick(value: AnalyticsPreset) {
    if (value === "custom") {
      setActivePreset("custom");
      setPickingEnd(false);
      return;
    }
    navigateToPreset(value);
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
    navigateToCustom({ from: range.from, to: range.to });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPickingEnd(false);
          setActivePreset(preset);
          setDraftRange(parseDraftRange(from, to));
        }
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={`Date range: ${label}`}
          />
        }
      >
        <span>
          Date: <span className="text-foreground">{label}</span>
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
              {ANALYTICS_DATE_PRESETS.map((option) => (
                <PresetButton
                  key={option.value}
                  label={option.label}
                  selected={activePreset === option.value}
                  onClick={() => handlePresetClick(option.value)}
                />
              ))}
              <PresetButton
                label="Custom Range"
                selected={activePreset === "custom"}
                onClick={() => handlePresetClick("custom")}
              />
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

function parseDraftRange(from: string, to: string): DateRange {
  return {
    from: parseISO(from),
    to: parseISO(to),
  };
}

function PresetButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 cursor-pointer rounded-md px-3 py-2 text-left text-sm whitespace-nowrap transition-colors",
        selected
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
