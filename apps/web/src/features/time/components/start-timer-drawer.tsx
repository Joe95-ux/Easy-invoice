"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, PlayIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Switch } from "@/components/ui/switch";
import { useTimeTimer } from "@/features/time/components/time-timer-provider";
import type { ClientListItem } from "@/lib/clients";

type StartTimerDrawerProps = {
  clients: ClientListItem[];
};

export function StartTimerDrawer({ clients }: StartTimerDrawerProps) {
  const {
    startDrawerOpen,
    setStartDrawerOpen,
    startTimer,
    isBusy,
    defaultHourlyRate,
  } = useTimeTimer();

  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [hourlyRate, setHourlyRate] = useState(
    defaultHourlyRate ? String(defaultHourlyRate) : "",
  );
  const [billable, setBillable] = useState(true);
  // Popups (combobox) must portal inside the drawer so Vaul's Radix focus trap
  // treats them as part of the drawer; portaling to document.body closes them.
  const [popupContainer, setPopupContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!startDrawerOpen) return;
    setClientId("");
    setDescription("");
    setHourlyRate(defaultHourlyRate ? String(defaultHourlyRate) : "");
    setBillable(true);
  }, [startDrawerOpen, defaultHourlyRate]);

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name,
  }));

  async function handleStart() {
    if (!description.trim()) {
      toast.error("Add a description for this timer");
      return;
    }

    const parsedRate = hourlyRate ? Number(hourlyRate) : defaultHourlyRate ?? 0;
    if (!Number.isFinite(parsedRate) || parsedRate < 0) {
      toast.error("Enter a valid hourly rate");
      return;
    }

    try {
      await startTimer({
        clientId: clientId || null,
        description: description.trim(),
        hourlyRate: parsedRate,
        billable,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start timer");
    }
  }

  return (
    <Drawer
      direction="right"
      open={startDrawerOpen}
      onOpenChange={setStartDrawerOpen}
    >
      <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md">
        <div ref={setPopupContainer} />
        <DrawerHeader className="border-b">
          <DrawerTitle>Start timer</DrawerTitle>
          <DrawerDescription>
            Track time as you work. Stop the timer to log hours automatically.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {clients.length > 0 && (
            <SearchableSelect
              id="timer-client"
              label="Client"
              value={clientId}
              options={clientOptions}
              onChange={(value) => setClientId(value ?? "")}
              placeholder="Select client (optional)"
              container={popupContainer}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="timer-description">Description</Label>
            <Input
              id="timer-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Website redesign, support call"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timer-rate">Hourly rate</Label>
            <Input
              id="timer-rate"
              type="number"
              min={0}
              step={0.01}
              value={hourlyRate}
              onChange={(event) => setHourlyRate(event.target.value)}
              placeholder={defaultHourlyRate ? String(defaultHourlyRate) : "0.00"}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="timer-billable">Billable</Label>
              <p className="text-xs text-muted-foreground">
                Only billable time can be added to invoices.
              </p>
            </div>
            <Switch
              id="timer-billable"
              checked={billable}
              onCheckedChange={setBillable}
            />
          </div>
        </div>

        <DrawerFooter className="border-t">
          <Button onClick={() => void handleStart()} disabled={isBusy}>
            {isBusy ? (
              <>
                <Loader2Icon className="animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <PlayIcon className="size-4" />
                Start timer
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setStartDrawerOpen(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
