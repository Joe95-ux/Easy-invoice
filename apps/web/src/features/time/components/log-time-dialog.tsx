"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/forms/date-picker";
import type { ClientListItem } from "@/lib/clients";
import { RecentDescriptionsField } from "@/features/time/components/recent-descriptions-field";
import { invoiceFromTimeUrl } from "@/lib/time-tracking/invoice-from-time";
import { resolveHourlyRateFromDefaults } from "@/lib/time-tracking/resolve-hourly-rate";

type SerializedTimeEntry = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  description: string;
  date: string;
  hours: number;
  hourlyRate: number;
  billable: boolean;
};

type LogTimeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientListItem[];
  defaultHourlyRate?: number | null;
  initialClientId?: string;
  entry?: SerializedTimeEntry | null;
  recentDescriptions?: string[];
};

export function LogTimeDialog({
  open,
  onOpenChange,
  clients,
  defaultHourlyRate = null,
  initialClientId,
  entry = null,
  recentDescriptions = [],
}: LogTimeDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(entry);
  const [clientId, setClientId] = useState(entry?.clientId ?? initialClientId ?? "");
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
    if (!isEditing) {
      setHourlyRate(rateForClient(nextClientId));
    }
  }

  useEffect(() => {
    if (!open) return;
    const nextClientId = entry?.clientId ?? initialClientId ?? "";
    setClientId(nextClientId);
    setAddNewClient(false);
    setNewClientName("");
    setDescription(entry?.description ?? "");
    setDate(entry?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setHours(entry?.hours?.toString() ?? "1");
    setHourlyRate(
      entry?.hourlyRate?.toString() ?? rateForClient(nextClientId),
    );
    setBillable(entry?.billable ?? true);
  }, [open, entry, initialClientId, defaultHourlyRate, clients]);

  const clientOptions = clients.map((client) => ({ value: client.id, label: client.name }));

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

      if (!isEditing && billable && resolvedClientId) {
        toast.success("Time logged", {
          action: {
            label: "Create invoice",
            onClick: () => router.push(invoiceFromTimeUrl({ clientId: resolvedClientId!, openPicker: true })),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit time entry" : "Log time"}</DialogTitle>
          <DialogDescription>
            Record billable hours to add them to invoices later.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
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
            />
          )}

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
            <div>
              <Label htmlFor="time-billable">Billable</Label>
              <p className="text-xs text-muted-foreground">Only billable entries can be invoiced.</p>
            </div>
            <Switch id="time-billable" checked={billable} onCheckedChange={setBillable} />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
