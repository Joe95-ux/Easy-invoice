"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientListItem } from "@/lib/clients";
import { ActiveTimerDrawer } from "@/features/time/components/active-timer-drawer";
import { StartTimerDrawer } from "@/features/time/components/start-timer-drawer";
import { useTimeTimer } from "@/features/time/components/time-timer-provider";

type ProjectOption = {
  id: string;
  name: string;
  clientId: string | null;
};

export function TimeTimerShell({ activeCompanyId }: { activeCompanyId: string }) {
  const { timer, recentDescriptions } = useTimeTimer();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

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

  const reloadProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/projects");
      const body = await response.json();
      if (!response.ok) return;
      setProjects(
        (body.projects ?? []).map(
          (project: { id: string; name: string; clientId: string | null }) => ({
            id: project.id,
            name: project.name,
            clientId: project.clientId,
          }),
        ),
      );
    } catch {
      // Optional project picker.
    }
  }, []);

  useEffect(() => {
    setClients([]);
    setProjects([]);
    void reloadClients();
    void reloadProjects();
  }, [activeCompanyId, reloadClients, reloadProjects]);

  return (
    <>
      <StartTimerDrawer
        clients={clients}
        projects={projects}
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
