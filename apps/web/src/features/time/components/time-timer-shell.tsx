"use client";

import { useEffect, useState } from "react";
import type { ClientListItem } from "@/lib/clients";
import { ActiveTimerDrawer } from "@/features/time/components/active-timer-drawer";
import { StartTimerDrawer } from "@/features/time/components/start-timer-drawer";
import { useTimeTimer } from "@/features/time/components/time-timer-provider";

export function TimeTimerShell() {
  const { timer } = useTimeTimer();
  const [clients, setClients] = useState<ClientListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      try {
        const response = await fetch("/api/clients");
        const body = await response.json();
        if (!response.ok || cancelled) return;
        setClients(body.clients ?? []);
      } catch {
        // Drawers still work without client pickers.
      }
    }

    void loadClients();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <StartTimerDrawer clients={clients} />
      {timer ? <ActiveTimerDrawer clients={clients} /> : null}
    </>
  );
}
