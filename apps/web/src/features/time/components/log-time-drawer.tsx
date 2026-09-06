"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
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
import { DatePicker } from "@/components/forms/date-picker";
import type { ClientListItem } from "@/lib/clients";
import { RecentDescriptionsField } from "@/features/time/components/recent-descriptions-field";
import { invoiceFromTimeUrl } from "@/lib/time-tracking/invoice-from-time";
import { resolveHourlyRateFromDefaults } from "@/lib/time-tracking/resolve-hourly-rate";

type ProjectOption = {
  id: string;
  name: string;
  clientId: string | null;
};

type SerializedTimeEntry = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  projectId?: string | null;
  projectName?: string | null;
  description: string;
  date: string;
  hours: number;
  hourlyRate: number;
  billable: boolean;
};

type LogTimeDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientListItem[];
  projects?: ProjectOption[];
  defaultHourlyRate?: number | null;
  initialClientId?: string;
  initialProjectId?: string;
  entry?: SerializedTimeEntry | null;
  recentDescriptions?: string[];
};

export function LogTimeDrawer({
  open,
  onOpenChange,
  clients,
  projects = [],
  defaultHourlyRate = null,
  initialClientId,
  initialProjectId,
  entry = null,
  recentDescriptions = [],
}: LogTimeDrawerProps) {
  const router = useRouter();
  const isEditing = Boolean(entry);
  const [clientId, setClientId] = useState(entry?.clientId ?? initialClientId ?? "");
  const [projectId, setProjectId] = useState(entry?.projectId ?? initialProjectId ?? "");
  const [addNewClient, setAddNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [date, setDate] = useState(entry?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState(entry?.hours?.toString() ?? "1");
  const [hourlyRate, setHourlyRate] = useState(
    entry?.hourlyRate?.toString() ?? (defaultHourlyRate ? String(defaultHourlyRate) : ""),
  );
  const [billable, setBillable] = useState(entry?.billable ?? true);
  const [saving, setSaving] = useState(false);
  // Popups must portal inside the drawer so Vaul's focus trap keeps them usable.
  const [popupContainer, setPopupContainer] = useState<HTMLElement | null>(null);

  function rateForClient(selectedClientId: string) {
    const client = clients.find((item) => item.id === selectedClientId);
    const rate = resolveHourlyRateFromDefaults({
      clientDefaultHourlyRate:
        client?.defaultHourlyRate != null ? Number(client.defaultHourlyRate) : null,
      companyDefaultHourlyRate: defaultHourlyRate,
    });
    return rate > 0 ? String(rate) : "";
  }

  function handleClientChange(value: string | null) {
    const nextClientId = value ?? "";
    setClientId(nextClientId);
    if (projectId) {
      const selected = projects.find((project) => project.id === projectId);
      if (selected?.clientId && selected.clientId !== nextClientId) {
        setProjectId("");
      }
    }
    if (!isEditing) {
      setHourlyRate(rateForClient(nextClientId));
    }
  }

  function handleProjectChange(value: string | null) {
    const nextProjectId = value === "__none__" || !value ? "" : value;
    setProjectId(nextProjectId);
    if (!nextProjectId) return;
    const selected = projects.find((project) => project.id === nextProjectId);
    if (selected?.clientId && selected.clientId !== clientId) {
      setClientId(selected.clientId);
      if (!isEditing) {
        setHourlyRate(rateForClient(selected.clientId));
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    const nextClientId = entry?.clientId ?? initialClientId ?? "";
    const nextProjectId = entry?.projectId ?? initialProjectId ?? "";
    setClientId(nextClientId);
    setProjectId(nextProjectId);
    setAddNewClient(false);
    setNewClientName("");
    setDescription(entry?.description ?? "");
    setDate(entry?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setHours(entry?.hours?.toString() ?? "1");
    setHourlyRate(entry?.hourlyRate?.toString() ?? rateForClient(nextClientId));
    setBillable(entry?.billable ?? true);
  }, [open, entry, initialClientId, initialProjectId, defaultHourlyRate, clients]);

  const clientOptions = clients.map((client) => ({ value: client.id, label: client.name }));
  const projectOptions = [
    { value: "__none__", label: "No project" },
    ...projects
      .filter((project) => !clientId || !project.clientId || project.clientId === clientId)
      .map((project) => ({ value: project.id, label: project.name })),
  ];

  async function handleSubmit() {
    const parsedHours = Number(hours);
    const parsedRate = Number(hourlyRate);

    if (!description.trim()) {
      toast.error("Add a description for this time entry");
      return;
    }
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      toast.error("Enter valid hours");
      return;
    }
    if (!Number.isFinite(parsedRate) || parsedRate < 0) {
      toast.error("Enter a valid hourly rate");
      return;
    }
    if (addNewClient && !newClientName.trim()) {
      toast.error("Enter a client name");
      return;
    }

    setSaving(true);
    try {
      let resolvedClientId = clientId || null;

      if (addNewClient) {
        const clientResponse = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newClientName.trim(), country: "US" }),
        });
        const clientBody = await clientResponse.json();
        if (!clientResponse.ok) throw new Error(clientBody.error ?? "Failed to create client");
        resolvedClientId = clientBody.client.id;
      }

      const url = isEditing ? `/api/time-entries/${entry!.id}` : "/api/time-entries";
      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: resolvedClientId,
          projectId: projectId || null,
          description: description.trim(),
          date,
          hours: parsedHours,
          hourlyRate: parsedRate,
          billable,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save time entry");

      onOpenChange(false);
      router.refresh();

      if (!isEditing && billable && (resolvedClientId || body.entry?.clientId)) {
        const invoiceClientId = resolvedClientId || body.entry.clientId;
        toast.success("Time logged", {
          action: {
            label: "Create invoice",
            onClick: () =>
              router.push(
                invoiceFromTimeUrl({
                  clientId: invoiceClientId,
                  openPicker: true,
                  projectId: projectId || undefined,
                }),
              ),
          },
        });
      } else {
        toast.success(isEditing ? "Time entry updated" : "Time logged");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save time entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md">
        <div ref={setPopupContainer} />
        <DrawerHeader className="border-b">
          <DrawerTitle>{isEditing ? "Edit time entry" : "Log time"}</DrawerTitle>
          <DrawerDescription>
            Record billable hours to add them to invoices later.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!isEditing && (
            <div className="space-y-3">
              {clients.length > 0 && !addNewClient && (
                <SearchableSelect
                  id="time-client"
                  label="Client"
                  value={clientId}
                  options={clientOptions}
                  onChange={handleClientChange}
                  placeholder="Select client (optional)"
                  container={popupContainer}
                />
              )}
              {addNewClient ? (
                <div className="space-y-2">
                  <Label htmlFor="new-client-name">New client name</Label>
                  <Input
                    id="new-client-name"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Client or company name"
                    autoFocus
                  />
                </div>
              ) : null}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() => setAddNewClient((value) => !value)}
              >
                {addNewClient ? "Pick an existing client instead" : "+ Add new client"}
              </Button>
              {billable && !clientId && !addNewClient && (
                <p className="text-xs text-muted-foreground">
                  Add a client to invoice this time in one click later.
                </p>
              )}
            </div>
          )}

          {isEditing && clients.length > 0 && (
            <SearchableSelect
              id="time-client"
              label="Client"
              value={clientId}
              options={clientOptions}
              onChange={handleClientChange}
              placeholder="Select client (optional)"
              container={popupContainer}
            />
          )}

          {projects.length > 0 && !addNewClient ? (
            <SearchableSelect
              id="time-project"
              label="Project"
              value={projectId || "__none__"}
              options={projectOptions}
              onChange={handleProjectChange}
              placeholder="Optional project"
              container={popupContainer}
            />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="time-description">Description</Label>
            <Input
              id="time-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Website redesign, support call"
            />
            {!isEditing && (
              <RecentDescriptionsField
                descriptions={recentDescriptions}
                onSelect={setDescription}
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="time-date">Date</Label>
              <DatePicker
                id="time-date"
                value={date}
                onChange={setDate}
                placeholder="Select date"
                container={popupContainer}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-hours">Hours</Label>
              <Input
                id="time-hours"
                type="number"
                min={0.25}
                step={0.25}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-rate">Hourly rate</Label>
            <Input
              id="time-rate"
              type="number"
              min={0}
              step={0.01}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder={defaultHourlyRate ? String(defaultHourlyRate) : "0.00"}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="min-w-0">
              <Label htmlFor="time-billable">Billable</Label>
              <p className="text-xs text-muted-foreground">
                Only billable entries can be invoiced.
              </p>
            </div>
            <Switch
              id="time-billable"
              checked={billable}
              onCheckedChange={(checked) => setBillable(checked === true)}
            />
          </div>
        </div>

        <DrawerFooter className="border-t">
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? (
              <>
                <Loader2Icon className="animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              "Save changes"
            ) : (
              "Log time"
            )}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
