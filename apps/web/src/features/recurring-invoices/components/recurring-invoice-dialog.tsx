"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  frequencyLabel,
  type SerializedRecurringInvoice,
} from "@/lib/recurring-invoices-shared";
import type { RecurringFrequency } from "@easy-invoice/db";

export type RecurringClientOption = {
  id: string;
  name: string;
  email: string | null;
};

type LineDraft = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type RecurringInvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: RecurringClientOption[];
  currency: string;
  editing?: SerializedRecurringInvoice | null;
  onSaved: (row: SerializedRecurringInvoice) => void;
};

const FREQUENCY_ITEMS: { value: RecurringFrequency; label: string }[] = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];

function todayUtcDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unitPrice: "0",
  };
}

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

export function RecurringInvoiceDialog({
  open,
  onOpenChange,
  clients,
  currency,
  editing,
  onSaved,
}: RecurringInvoiceDialogProps) {
  const isEdit = Boolean(editing);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("MONTHLY");
  const [interval, setInterval] = useState("1");
  const [startDate, setStartDate] = useState(todayUtcDateOnly());
  const [nextIssueDate, setNextIssueDate] = useState(todayUtcDateOnly());
  const [endDate, setEndDate] = useState("");
  const [maxOccurrences, setMaxOccurrences] = useState("");
  const [dueDaysAfterIssue, setDueDaysAfterIssue] = useState("14");
  const [autoSend, setAutoSend] = useState(false);
  const [taxRatePercent, setTaxRatePercent] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);

  const clientItems = useMemo(
    () => clients.map((c) => ({ value: c.id, label: c.name })),
    [clients],
  );

  useEffect(() => {
    if (open && !wasOpen.current) {
      if (editing) {
        setName(editing.name);
        setClientId(editing.client.id);
        setFrequency(editing.frequency);
        setInterval(String(editing.interval));
        setStartDate(editing.startDate);
        setNextIssueDate(editing.nextIssueDate);
        setEndDate(editing.endDate ?? "");
        setMaxOccurrences(
          editing.maxOccurrences != null ? String(editing.maxOccurrences) : "",
        );
        setDueDaysAfterIssue(String(editing.dueDaysAfterIssue));
        setAutoSend(editing.autoSend);
        setTaxRatePercent(String(Number((editing.taxRate * 100).toFixed(4))));
        setDiscount(String(editing.discount));
        setNotes(editing.notes ?? "");
        setLines(
          editing.items.length > 0
            ? editing.items.map((item) => ({
                key: item.id,
                description: item.description,
                quantity: String(item.quantity),
                unitPrice: String(item.unitPrice),
              }))
            : [emptyLine()],
        );
      } else {
        const today = todayUtcDateOnly();
        setName("");
        setClientId(clients[0]?.id ?? "");
        setFrequency("MONTHLY");
        setInterval("1");
        setStartDate(today);
        setNextIssueDate(today);
        setEndDate("");
        setMaxOccurrences("");
        setDueDaysAfterIssue("14");
        setAutoSend(false);
        setTaxRatePercent("0");
        setDiscount("0");
        setNotes("");
        setLines([emptyLine()]);
      }
    }
    wasOpen.current = open;
  }, [open, editing, clients]);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Add a schedule name");
      return;
    }
    if (!clientId) {
      toast.error("Select a client");
      return;
    }

    const parsedInterval = Number(interval);
    const parsedDueDays = Number(dueDaysAfterIssue);
    const parsedTaxPercent = Number(taxRatePercent);
    const parsedDiscount = Number(discount);
    const parsedMax = maxOccurrences.trim() ? Number(maxOccurrences) : null;

    if (!Number.isInteger(parsedInterval) || parsedInterval < 1) {
      toast.error("Interval must be a whole number of 1 or more");
      return;
    }
    if (!Number.isInteger(parsedDueDays) || parsedDueDays < 0) {
      toast.error("Due days must be zero or more");
      return;
    }
    if (!Number.isFinite(parsedTaxPercent) || parsedTaxPercent < 0 || parsedTaxPercent > 100) {
      toast.error("Tax rate must be between 0 and 100");
      return;
    }
    if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0) {
      toast.error("Discount must be zero or more");
      return;
    }
    if (parsedMax != null && (!Number.isInteger(parsedMax) || parsedMax < 1)) {
      toast.error("Max occurrences must be a whole number of 1 or more");
      return;
    }

    const lineItems: {
      description: string;
      quantity: number;
      unitPrice: number;
      sortOrder: number;
    }[] = [];

    for (const [index, line] of lines.entries()) {
      const description = line.description.trim();
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      if (!description) {
        toast.error("Each line needs a description");
        return;
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        toast.error("Each line needs a quantity greater than zero");
        return;
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        toast.error("Each line needs a valid unit price");
        return;
      }
      lineItems.push({ description, quantity, unitPrice, sortOrder: index });
    }

    if (lineItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    const payload = {
      name: name.trim(),
      clientId,
      frequency,
      interval: parsedInterval,
      startDate,
      nextIssueDate,
      endDate: endDate.trim() || null,
      maxOccurrences: parsedMax,
      dueDaysAfterIssue: parsedDueDays,
      autoSend,
      currency: isEdit ? editing!.currency : currency,
      taxRate: parsedTaxPercent / 100,
      discount: parsedDiscount,
      notes: notes.trim() || null,
      lineItems,
    };

    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/recurring-invoices/${editing!.id}` : "/api/recurring-invoices",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          firstValidationMessage(data.details) ?? data.error ?? "Could not save schedule",
        );
      }
      toast.success(isEdit ? "Schedule updated" : "Recurring schedule created");
      onSaved(data.recurringInvoice as SerializedRecurringInvoice);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save schedule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit recurring invoice" : "New recurring invoice"}</DialogTitle>
          <DialogDescription>
            {frequencyLabel(frequency, Number(interval) || 1)}. Invoices are created on the next
            issue date (UTC).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="recurring-name">Schedule name</Label>
              <Input
                id="recurring-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Monthly retainer – Acme"
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={clientId || undefined}
                onValueChange={(value) => value && setClientId(value)}
                items={clientItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clientItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Label htmlFor="recurring-interval">Every N</Label>
                <Input
                  id="recurring-interval"
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
                <Label htmlFor="recurring-start">Start date</Label>
                <Input
                  id="recurring-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!isEdit) setNextIssueDate(e.target.value);
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recurring-next">Next issue date</Label>
                <Input
                  id="recurring-next"
                  type="date"
                  value={nextIssueDate}
                  onChange={(e) => setNextIssueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recurring-end">End date (optional)</Label>
                <Input
                  id="recurring-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recurring-max">Max occurrences (optional)</Label>
                <Input
                  id="recurring-max"
                  type="number"
                  min={1}
                  value={maxOccurrences}
                  onChange={(e) => setMaxOccurrences(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="recurring-due-days">Due after (days)</Label>
                <Input
                  id="recurring-due-days"
                  type="number"
                  min={0}
                  value={dueDaysAfterIssue}
                  onChange={(e) => setDueDaysAfterIssue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recurring-tax">Tax %</Label>
                <Input
                  id="recurring-tax"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={taxRatePercent}
                  onChange={(e) => setTaxRatePercent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recurring-discount">Discount ({currency})</Label>
                <Input
                  id="recurring-discount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">Auto-send</p>
                <p className="text-xs text-muted-foreground">
                  Email each invoice when generated (client email required).
                </p>
              </div>
              <Switch checked={autoSend} onCheckedChange={setAutoSend} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Line items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLines((prev) => [...prev, emptyLine()])}
                >
                  <PlusIcon />
                  Add line
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((line) => (
                  <div
                    key={line.key}
                    className="grid gap-2 rounded-[10px] border p-2 sm:grid-cols-[1fr_5rem_6.5rem_auto]"
                  >
                    <Input
                      value={line.description}
                      onChange={(e) => updateLine(line.key, { description: e.target.value })}
                      placeholder="Description"
                      required
                    />
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      aria-label="Quantity"
                    />
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                      aria-label="Unit price"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      disabled={lines.length <= 1}
                      onClick={() =>
                        setLines((prev) => prev.filter((row) => row.key !== line.key))
                      }
                      aria-label="Remove line"
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurring-notes">Notes (optional)</Label>
              <Textarea
                id="recurring-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={5000}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || clients.length === 0}>
              {saving ? <Loader2Icon className="animate-spin" /> : null}
              {isEdit ? "Save changes" : "Create schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
