"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientListItem } from "@/lib/clients";
import { ActiveTimerDrawer } from "@/features/time/components/active-timer-drawer";
import { StartTimerDrawer } from "@/features/time/components/start-timer-drawer";
import { useTimeTimer } from "@/features/time/components/time-timer-provider";

export function TimeTimerShell({ activeCompanyId }: { activeCompanyId: string }) {
  const { timer, recentDescriptions } = useTimeTimer();
  const [clients, setClients] = useState<ClientListItem[]>([]);

  const reloadClients = useCallback(async () => {
    try {
      const response = await fetch("/api/clients");
      const body = await response.json();
      if (!response.ok) return;
      setClients(body.clients ?? []);
    } catch {
      // Drawers still work without client pickers.
    }
  }, []);

  useEffect(() => {
    setClients([]);
    void reloadClients();
  }, [activeCompanyId, reloadClients]);

  return (
    <>
      <StartTimerDrawer
        clients={clients}
        recentDescriptions={recentDescriptions}
        onClientsChange={reloadClients}
      />
      {timer ? (
        <ActiveTimerDrawer
          clients={clients}
          recentDescriptions={recentDescriptions}
          onClientsChange={reloadClients}
        />
      ) : null}
    </>
  );
}
