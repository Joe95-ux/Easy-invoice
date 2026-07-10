"use client";

import { TimerHeaderChip } from "@/features/time/components/timer-header-chip";
import { useTimeTimer } from "@/features/time/components/time-timer-provider";

/**
 * On small screens the timer chip crowds the main header, so it lives in a
 * dedicated bar above it. Hidden on `lg`+ where the chip stays in the main nav.
 */
export function TimerMobileNav() {
  const { timer, isLoading } = useTimeTimer();

  if (isLoading || !timer) return null;

  return (
    <div className="flex h-11 shrink-0 items-center justify-end border-b border-border/70 px-4 lg:hidden">
      <TimerHeaderChip />
    </div>
  );
}
