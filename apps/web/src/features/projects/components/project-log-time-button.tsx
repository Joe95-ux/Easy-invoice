"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogTimeDrawer } from "@/features/time/components/log-time-drawer";
import type { ClientListItem } from "@/lib/clients";

type ProjectLogTimeButtonProps = {
  projectId: string;
  projectName: string;
  clientId: string | null;
  clients: ClientListItem[];
  defaultHourlyRate: number | null;
  recentDescriptions: string[];
};

export function ProjectLogTimeButton({
  projectId,
  projectName,
  clientId,
  clients,
  defaultHourlyRate,
  recentDescriptions,
}: ProjectLogTimeButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        Log time
      </Button>
      <LogTimeDrawer
        open={open}
        onOpenChange={setOpen}
        clients={clients}
        projects={[{ id: projectId, name: projectName, clientId }]}
        defaultHourlyRate={defaultHourlyRate}
        initialClientId={clientId ?? undefined}
        initialProjectId={projectId}
        recentDescriptions={recentDescriptions}
      />
    </>
  );
}
