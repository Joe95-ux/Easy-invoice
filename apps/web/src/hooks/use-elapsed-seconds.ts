"use client";

import { useEffect, useState } from "react";

export function useElapsedSeconds(startedAt: string | null, active: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!startedAt || !active) {
      setElapsedSeconds(0);
      return;
    }

    function tick() {
      const started = new Date(startedAt!).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    }

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [startedAt, active]);

  return elapsedSeconds;
}

/** Remind once after 4 hours of continuous tracking. */
export const TIMER_REMINDER_SECONDS = 4 * 60 * 60;
