"use client";

import { ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimeTimer } from "@/features/time/components/time-timer-provider";
import { formatElapsedClock } from "@/lib/time-tracking/format";
import { cn } from "@/lib/utils";

export function TimerHeaderChip({ className }: { className?: string }) {
  const { timer, elapsedSeconds, toggleActiveTimer, isLoading } = useTimeTimer();

  if (isLoading || !timer) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "inline-flex h-8 gap-1.5 border-primary/30 bg-primary/5 px-2.5 text-primary hover:bg-primary/10",
        className,
      )}
      onClick={toggleActiveTimer}
    >
      <ClockIcon className="size-3.5" />
      <span className="max-w-[7rem] truncate text-xs">{timer.description}</span>
      <span className="font-mono text-xs tabular-nums">
        {formatElapsedClock(elapsedSeconds)}
      </span>
    </Button>
  );
}
