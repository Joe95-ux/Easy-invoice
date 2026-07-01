"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { DatePicker } from "@/components/forms/date-picker";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClientListItem } from "@/lib/clients";

type ImportTimeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientListItem[];
  defaultHourlyRate?: number | null;
};

export function ImportTimeDialog({
  open,
  onOpenChange,
  clients,
  defaultHourlyRate = null,
}: ImportTimeDialogProps) {
  const router = useRouter();
  const [provider, setProvider] = useState<"toggl" | "clockify">("toggl");
  const [apiKey, setApiKey] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [clientId, setClientId] = useState("");
  const [matchClientsByProject, setMatchClientsByProject] = useState(true);
  const [fallbackHourlyRate, setFallbackHourlyRate] = useState(
    defaultHourlyRate ? String(defaultHourlyRate) : "",
  );
  const [importing, setImporting] = useState(false);

  const clientOptions = clients.map((client) => ({ value: client.id, label: client.name }));

  async function handleImport() {
    if (!apiKey.trim()) {
      toast.error("Enter your API key");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch("/api/time-entries/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          startDate,
          endDate,
          clientId: clientId || null,
          matchClientsByProject,
          fallbackHourlyRate: fallbackHourlyRate ? Number(fallbackHourlyRate) : undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Import failed");

      const parts = [`${body.imported} imported`];
      if (body.skipped) parts.push(`${body.skipped} already imported`);
      if (body.unmatched) parts.push(`${body.unmatched} skipped (no client match)`);

      toast.success(parts.join(" · "));
      setApiKey("");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import time");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import time</DialogTitle>
          <DialogDescription>
            Pull entries from Toggl or Clockify. Your API key is used once and never stored.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => value && setProvider(value as "toggl" | "clockify")}
            >
              <SelectTrigger className="mb-0 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toggl">Toggl Track</SelectItem>
                <SelectItem value="clockify">Clockify</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-api-key">API key</Label>
            <Input
              id="import-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "toggl" ? "Toggl API token" : "Clockify API key"}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {provider === "toggl"
                ? "Find it in Toggl → Profile → API Token."
                : "Find it in Clockify → Profile settings → API."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="import-start">From</Label>
              <DatePicker id="import-start" value={startDate} onChange={setStartDate} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-end">To</Label>
              <DatePicker id="import-end" value={endDate} onChange={setEndDate} />
            </div>
          </div>

          {clients.length > 0 && (
            <SearchableSelect
              id="import-client"
              label="Assign all to client (optional)"
              value={clientId}
              options={clientOptions}
              onChange={(value) => setClientId(value ?? "")}
              placeholder="Use project matching instead"
              description="If empty, we match Toggl/Clockify project names to client names."
            />
          )}

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor="match-projects">Match projects to clients</Label>
              <p className="text-xs text-muted-foreground">
                e.g. project &ldquo;Acme Corp&rdquo; → client Acme Corp
              </p>
            </div>
            <Switch
              id="match-projects"
              checked={matchClientsByProject}
              onCheckedChange={setMatchClientsByProject}
              disabled={Boolean(clientId)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-rate">Fallback hourly rate</Label>
            <Input
              id="import-rate"
              type="number"
              min={0}
              step={0.01}
              value={fallbackHourlyRate}
              onChange={(e) => setFallbackHourlyRate(e.target.value)}
              placeholder={defaultHourlyRate ? String(defaultHourlyRate) : "0.00"}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleImport()} disabled={importing}>
            {importing ? (
              <>
                <Loader2Icon className="animate-spin" />
                Importing...
              </>
            ) : (
              "Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
