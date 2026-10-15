"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { throwIfApiError, toastApiError } from "@/lib/billing/plan-api-error";
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
import { DatePicker } from "@/components/forms/date-picker";
import type { PaymentMethod } from "@easy-invoice/db";
import { formatMoney } from "@/lib/invoices";
import { PAYMENT_METHOD_LABELS } from "@/lib/invoice-payments-utils";

const METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][];

type RecordRefundDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  currency: string;
  refundDue: number;
  creditNoteId?: string | null;
};

export function RecordRefundDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  currency,
  refundDue,
  creditNoteId,
}: RecordRefundDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(String(refundDue));
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("OTHER");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(String(refundDue));
      setPaidAt(new Date().toISOString().slice(0, 10));
      setMethod("OTHER");
      setReference("");
      setNote("");
    }
  }, [open, refundDue]);

  async function handleRecord() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a refund amount");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/refunds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsed,
          paidAt,
          method,
          reference: reference.trim() || undefined,
          note: note.trim() || undefined,
          creditNoteId: creditNoteId ?? undefined,
          processStripe: method === "CARD",
        }),
      });
      const data = await response.json().catch(() => ({}));
      throwIfApiError(response, data, "Could not record refund");
      toast.success("Refund recorded");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toastApiError(error, "Could not record refund");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record refund</DialogTitle>
          <DialogDescription>
            {invoiceNumber} has {formatMoney(refundDue, currency)} to return after credits.
            Card refunds go through Stripe when a card payment exists.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="refund-amount">Amount</Label>
            <Input
              id="refund-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker value={paidAt} onChange={setPaidAt} />
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select
              value={method}
              onValueChange={(value) => value && setMethod(value as PaymentMethod)}
              items={METHOD_OPTIONS.map(([value, label]) => ({ value, label }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHOD_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-reference">Reference</Label>
            <Input
              id="refund-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-note">Note</Label>
            <Input
              id="refund-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleRecord()} disabled={loading}>
            {loading ? "Recording…" : "Record refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
