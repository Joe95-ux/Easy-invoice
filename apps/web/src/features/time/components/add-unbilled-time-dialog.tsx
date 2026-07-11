"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LineItemInput } from "@/features/invoices/components/invoice-line-items";
import { formatMoney } from "@/lib/invoices";
import type { TimeGroupMode } from "@/lib/schemas/time-entry";
import {
  fetchUnbilledTimeEntries,
  timeEntriesToLineItems,
  type UnbilledTimeEntry,
} from "@/lib/time-tracking/fetch-unbilled";
import { formatDuration } from "@/lib/time-tracking/format";
import { groupTimeEntries } from "@/lib/time-tracking/grouping";

const GROUP_BY_OPTIONS = [
  { value: "per_task", label: "By task / description" },
  { value: "per_day", label: "By day" },
  { value: "per_entry", label: "One line per entry" },
] as const;

type AddUnbilledTimeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  currency: string;
  onAdd: (items: LineItemInput[]) => boolean;
  initialSelectedIds?: string[];
};

export function AddUnbilledTimeDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  currency,
  onAdd,
  initialSelectedIds,
}: AddUnbilledTimeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<UnbilledTimeEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<TimeGroupMode>("per_task");

  const initialSelectedIdsKey = initialSelectedIds?.join(",") ?? "";

  useEffect(() => {
    if (!open || !clientId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    void fetchUnbilledTimeEntries({ clientId, signal: controller.signal })
      .then((loaded) => {
        if (controller.signal.aborted) return;

        setEntries(loaded);
        setSelectedIds(
          initialSelectedIdsKey
            ? new Set(
                loaded
                  .map((entry) => entry.id)
                  .filter((id) => initialSelectedIdsKey.split(",").includes(id)),
              )
            : new Set(loaded.map((entry) => entry.id)),
        );
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        toast.error(error instanceof Error ? error.message : "Could not load time entries");
        setEntries([]);
        setSelectedIds(new Set());
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, clientId, initialSelectedIdsKey]);

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedIds.has(entry.id)),
    [entries, selectedIds],
  );

  const previewLines = useMemo(
    () =>
      groupTimeEntries(
        selectedEntries.map((entry) => ({
          id: entry.id,
          description: entry.description,
          date: new Date(entry.date),
          durationMinutes: entry.durationMinutes,
          hourlyRate: entry.hourlyRate,
        })),
        groupBy,
      ),
    [selectedEntries, groupBy],
  );

  const previewTotal = previewLines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );

  function toggleEntry(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleAdd() {
    if (previewLines.length === 0) {
      toast.error("Select at least one time entry");
      return;
    }

    const added = onAdd(timeEntriesToLineItems(selectedEntries, groupBy));
    if (!added) return;

    onOpenChange(false);
    toast.success(`Added ${previewLines.length} line item${previewLines.length === 1 ? "" : "s"} from time`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add from unbilled time</DialogTitle>
          <DialogDescription>
            Pull logged hours for {clientName} into line items.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2Icon className="mr-2 size-4 animate-spin" />
              Loading time entries...
            </div>
          ) : entries.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No unbilled time for this client. Log hours on the Time page first.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label>Group line items</Label>
              <Select
                value={groupBy}
                onValueChange={(value) => value && setGroupBy(value as TimeGroupMode)}
                items={[...GROUP_BY_OPTIONS]}
              >
                <SelectTrigger className="mb-0 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_task">By task / description</SelectItem>
                  <SelectItem value="per_day">By day</SelectItem>
                  <SelectItem value="per_entry">One line per entry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {entries.map((entry) => (
                <label
                  key={entry.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 p-3 hover:bg-muted/30"
                >
                  <Checkbox
                    checked={selectedIds.has(entry.id)}
                    onCheckedChange={(checked) => toggleEntry(entry.id, checked === true)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{entry.description}</p>
                      <Badge variant="secondary">{formatDuration(entry.durationMinutes)}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString()} ·{" "}
                      {formatMoney(entry.hourlyRate, currency)}/hr
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {previewLines.length > 0 && (
              <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                <p className="font-medium">Preview</p>
                <ul className="mt-2 space-y-1.5 text-muted-foreground">
                  {previewLines.map((line) => (
                    <li key={line.timeEntryIds.join("-")}>
                      {line.description} — {line.quantity}h × {formatMoney(line.unitPrice, currency)}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-medium text-foreground">
                  Subtotal: {formatMoney(previewTotal, currency)}
                </p>
              </div>
            )}
          </div>
        )}
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={loading || previewLines.length === 0}>
            Add to invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
