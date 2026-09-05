"use client";

import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/forms/date-picker";

export type ProjectExpenseRow = {
  id: string;
  description: string;
  date: string;
  amount: number;
  currency: string;
  billable: boolean;
  invoicedAt: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
};

type ProjectExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currency: string;
  expense?: ProjectExpenseRow | null;
  onSaved: (expense: ProjectExpenseRow) => void;
};

export function ProjectExpenseDialog({
  open,
  onOpenChange,
  projectId,
  currency,
  expense = null,
  onSaved,
}: ProjectExpenseDialogProps) {
  const isEditing = Boolean(expense);
  const locked = Boolean(expense?.invoicedAt);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [billable, setBillable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDescription(expense?.description ?? "");
    setDate(expense?.date.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    setAmount(expense ? String(expense.amount) : "");
    setBillable(expense?.billable ?? false);
  }, [open, expense]);

  async function handleSave() {
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!date) {
      toast.error("Date is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        description: description.trim(),
        date,
        amount: parsedAmount,
        billable,
      };
      const response = await fetch(
        isEditing
          ? `/api/projects/${projectId}/expenses/${expense!.id}`
          : `/api/projects/${projectId}/expenses`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to save expense");
      onSaved(body.expense as ProjectExpenseRow);
      toast.success(isEditing ? "Expense updated" : "Expense added");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save expense");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>
            Track costs on this job for profit and margin. Mark billable if you will pass the cost
            through on an invoice.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-description">Description</Label>
            <Input
              id="expense-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Stock photos, contractor, hosting…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount ({currency})</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                disabled={locked}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <Label htmlFor="expense-billable" className="font-normal">
                Billable to client
              </Label>
              <p className="text-xs text-muted-foreground">
                Pass-through cost you intend to invoice
              </p>
            </div>
            <Switch
              id="expense-billable"
              checked={billable}
              disabled={locked}
              onCheckedChange={setBillable}
            />
          </div>

          {locked ? (
            <p className="text-xs text-muted-foreground">
              This expense is already on an invoice — amount and billable status are locked.
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? "Saving…" : isEditing ? "Save" : "Add expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
