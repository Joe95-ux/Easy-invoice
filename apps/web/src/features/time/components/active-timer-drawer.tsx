"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2Icon, SquareIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Switch } from "@/components/ui/switch";
import { useTimeTimer } from "@/features/time/components/time-timer-provider";
import type { ClientListItem } from "@/lib/clients";
import { formatElapsedClock } from "@/lib/time-tracking/format";

type ActiveTimerDrawerProps = {
  clients: ClientListItem[];
};

const SNAP_POINTS = [0.5, 1] as const;

export function ActiveTimerDrawer({ clients }: ActiveTimerDrawerProps) {
  const {
    timer,
    activeDrawerOpen,
    setActiveDrawerOpen,
    elapsedSeconds,
    isBusy,
    stopTimer,
    discardTimer,
    updateTimer,
  } = useTimeTimer();

  const [snap, setSnap] = useState<number | string>(SNAP_POINTS[0]);
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [billable, setBillable] = useState(true);
  // Popups (combobox) must portal inside the drawer so Vaul's Radix focus trap
  // treats them as part of the drawer; portaling to document.body closes them.
  const [popupContainer, setPopupContainer] = useState<HTMLElement | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "stop" | "discard" | "save" | null
  >(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!timer) return;
    setDescription(timer.description);
    setClientId(timer.clientId ?? "");
    setHourlyRate(String(timer.hourlyRate));
    setBillable(timer.billable);
  }, [timer]);

  // Open halfway each time the drawer is toggled open (e.g. "View timer").
  useEffect(() => {
    if (activeDrawerOpen && !wasOpenRef.current) {
      setSnap(SNAP_POINTS[0]);
    }
    wasOpenRef.current = activeDrawerOpen;
  }, [activeDrawerOpen]);

  const elapsedLabel = formatElapsedClock(elapsedSeconds);

  const clientOptions = useMemo(
    () => clients.map((client) => ({ value: client.id, label: client.name })),
    [clients],
  );

  if (!timer) return null;

  async function handleStop() {
    setPendingAction("stop");
    try {
      await stopTimer();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not stop timer");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDiscard() {
    setPendingAction("discard");
    try {
      await discardTimer();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not discard timer");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSaveDetails() {
    setPendingAction("save");
    try {
      await updateTimer({
        description: description.trim(),
        clientId: clientId || null,
        hourlyRate: Number(hourlyRate),
        billable,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update timer");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Drawer
      open={activeDrawerOpen}
      onOpenChange={setActiveDrawerOpen}
      snapPoints={[...SNAP_POINTS]}
      activeSnapPoint={snap}
      setActiveSnapPoint={(value) => setSnap(value ?? SNAP_POINTS[0])}
      dismissible
    >
      <DrawerContent className="h-[92vh]">
        <div ref={setPopupContainer} />
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto px-4 pb-8">
          <DrawerHeader className="items-center pb-0 text-center">
            <DrawerTitle className="flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-primary">
              <span className="inline-block size-1.5 animate-pulse rounded-full bg-primary" />
              Timer running
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Track time as you work, then stop to log it.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col items-center gap-1 py-6">
            <p className="font-mono text-6xl font-semibold tabular-nums tracking-tight text-foreground sm:text-7xl">
              {elapsedLabel}
            </p>
            <p className="mt-3 max-w-md truncate text-center text-base font-medium">
              {timer.description}
            </p>
            <p className="text-sm text-muted-foreground">
              {timer.clientName ?? "No client"}
            </p>
          </div>

          <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              onClick={() => void handleStop()}
              disabled={isBusy}
            >
              {pendingAction === "stop" ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <SquareIcon className="size-4 fill-current" />
                  Stop &amp; log time
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => void handleDiscard()}
              disabled={isBusy}
            >
              {pendingAction === "discard" ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Discarding...
                </>
              ) : (
                <>
                  <Trash2Icon className="size-4" />
                  Discard
                </>
              )}
            </Button>
          </div>

          <div className="mx-auto mt-8 w-full max-w-md space-y-4 border-t pt-6">
            <p className="text-sm font-medium text-muted-foreground">Timer details</p>

            {clients.length > 0 && (
              <SearchableSelect
                id="active-timer-client"
                label="Client"
                value={clientId}
                options={clientOptions}
                onChange={(value) => setClientId(value ?? "")}
                placeholder="Select client (optional)"
                container={popupContainer}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="active-timer-description">Description</Label>
              <Input
                id="active-timer-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="active-timer-rate">Hourly rate</Label>
              <Input
                id="active-timer-rate"
                type="number"
                min={0}
                step={0.01}
                value={hourlyRate}
                onChange={(event) => setHourlyRate(event.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <Label htmlFor="active-timer-billable">Billable</Label>
                <p className="text-xs text-muted-foreground">
                  Only billable time can be invoiced.
                </p>
              </div>
              <Switch
                id="active-timer-billable"
                checked={billable}
                onCheckedChange={setBillable}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void handleSaveDetails()}
              disabled={isBusy || !description.trim()}
            >
              {pendingAction === "save" ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save details"
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
