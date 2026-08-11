"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { frequencyLabel, localDateOnly } from "@/lib/recurring-invoices-shared";
import type { RecurringFrequency } from "@easy-invoice/db";

type MakeRecurringDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  clientName?: string | null;
  clientEmail?: string | null;
  onCreated: (recurringInvoiceId: string) => void;
};

const FREQUENCY_ITEMS: { value: RecurringFrequency; label: string }[] = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

function firstValidationMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const fieldErrors = (details as { fieldErrors?: Record<string, string[] | undefined> })
    .fieldErrors;
  if (!fieldErrors) return null;
  for (const messages of Object.values(fieldErrors)) {
    if (messages?.[0]) return messages[0];
  }
  return null;
}

export function MakeRecurringDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  clientName,
  clientEmail,
  onCreated,
}: MakeRecurringDialogProps) {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("MONTHLY");
  const [interval, setInterval] = useState("1");
  const [startDate, setStartDate] = useState(localDateOnly());
  const [endDate, setEndDate] = useState("");
  const [maxOccurrences, setMaxOccurrences] = useState("");
  const [autoSend, setAutoSend] = useState(false);
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);
  const canAutoSend = Boolean(clientEmail?.trim());

  useEffect(() => {
    if (open && !wasOpen.current) {
      const today = localDateOnly();
      setName(
        clientName
          ? `${frequencyLabel("MONTHLY", 1)} – ${clientName}`
          : `Recurring from ${invoiceNumber}`,
      );
      setFrequency("MONTHLY");
      setInterval("1");
      setStartDate(today);
      setEndDate("");
      setMaxOccurrences("");
      setAutoSend(false);
    }
    wasOpen.current = open;
  }, [open, clientName, invoiceNumber]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsedInterval = Number(interval);
    const parsedMax = maxOccurrences.trim() ? Number(maxOccurrences) : null;

    if (!name.trim()) {
      toast.error("Add a schedule name");
      return;
    }
    if (!Number.isInteger(parsedInterval) || parsedInterval < 1) {
      toast.error("Interval must be a whole number of 1 or more");
      return;
    }
    if (parsedMax != null && (!Number.isInteger(parsedMax) || parsedMax < 1)) {
      toast.error("Max occurrences must be a whole number of 1 or more");
      return;
    }
    if (endDate.trim() && endDate.trim() < startDate) {
      toast.error("End date must be on or after the first issue date");
      return;
    }
    if (autoSend && !canAutoSend) {
      toast.error("Add a client email before enabling auto-send");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/make-recurring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          frequency,
          interval: parsedInterval,
          startDate,
          nextIssueDate: startDate,
          endDate: endDate.trim() || null,
          maxOccurrences: parsedMax,
          autoSend,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          firstValidationMessage(data.details) ??
            data.error ??
            "Could not create recurring schedule",
        );
      }
      toast.success("Recurring schedule created", {
        description: "Line items and totals were copied from this invoice.",
      });
      onCreated(data.recurringInvoice.id as string);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create recurring schedule",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCwIcon className="size-4" />
            Make recurring
          </DialogTitle>
          <DialogDescription>
            Copy client, line items, tax, and notes from {invoiceNumber} into a schedule. The
            first invoice is generated on the start date (UTC).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="make-recurring-name">Schedule name</Label>
              <Input
                id="make-recurring-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={frequency}
                  onValueChange={(value) =>
                    value && setFrequency(value as RecurringFrequency)
                  }
                  items={FREQUENCY_ITEMS}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="make-recurring-interval">Every N</Label>
                <Input
                  id="make-recurring-interval"
                  type="number"
                  min={1}
                  max={52}
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="make-recurring-start">First issue date</Label>
                <Input
                  id="make-recurring-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="make-recurring-end">End date (optional)</Label>
                <Input
                  id="make-recurring-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="make-recurring-max">Max occurrences (optional)</Label>
              <Input
                id="make-recurring-max"
                type="number"
                min={1}
                value={maxOccurrences}
                onChange={(e) => setMaxOccurrences(e.target.value)}
                placeholder="Unlimited"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">Auto-send</p>
                <p className="text-xs text-muted-foreground">
                  {canAutoSend
                    ? "Email each generated invoice when the schedule runs."
                    : "This client needs an email address to enable auto-send."}
                </p>
              </div>
              <Switch
                checked={autoSend}
                disabled={!canAutoSend}
                onCheckedChange={(checked) => {
                  if (checked && !canAutoSend) {
                    toast.error("Add a client email before enabling auto-send");
                    return;
                  }
                  setAutoSend(checked);
                }}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2Icon className="animate-spin" /> : null}
              Create schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
