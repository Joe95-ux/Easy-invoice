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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/forms/date-picker";
import type { InvoiceStatus, PaymentMethod } from "@easy-invoice/db";
import { formatMoney } from "@/lib/invoices";
import { PAYMENT_METHOD_LABELS } from "@/lib/invoice-payments-utils";
import { showPaymentRecordedFeedback } from "@/lib/celebrate-invoice-paid";

const METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][];

type RecordPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  balanceDue: number;
  /** Prefill for the amount field; defaults to the full balance due. */
  initialAmount?: number;
  celebrateInvoicePaid?: boolean;
};

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  status,
  currency,
  balanceDue,
  initialAmount,
  celebrateInvoicePaid = false,
}: RecordPaymentDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("OTHER");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(String(initialAmount ?? balanceDue));
      setPaidAt(new Date().toISOString().slice(0, 10));
      setMethod("OTHER");
      setReference("");
      setNote("");
    }
  }, [open, initialAmount, balanceDue]);

  async function handleRecordPayment() {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          paidAt: new Date(paidAt).toISOString(),
          method,
          reference: reference || undefined,
          note: note || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to record payment");

      showPaymentRecordedFeedback({
        invoiceNumber,
        status: data.invoice?.status ?? status,
        celebrateInvoicePaid,
      });

      if (data.confirmationEmail?.sent) {
        toast.success("Payment confirmation emailed", {
          description: `Receipt and updated invoice sent to ${data.confirmationEmail.toEmail}.`,
        });
      } else if (data.confirmationEmail?.error) {
        toast.warning("Payment recorded, but confirmation email failed", {
          description: data.confirmationEmail.error,
        });
      }

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Record a payment for {invoiceNumber}. Balance due: {formatMoney(balanceDue, currency)}.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-amount">Amount</Label>
            <Input
              id="payment-amount"
              type="number"
              min={0}
              step="0.01"
              max={balanceDue}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-date">Payment date</Label>
            <DatePicker
              id="payment-date"
              value={paidAt}
              onChange={setPaidAt}
              placeholder="Select payment date"
              disabled={loading}
            />
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
            <Label htmlFor="payment-reference">Reference</Label>
            <Input
              id="payment-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check #, transaction ID, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment-note">Note</Label>
            <Input
              id="payment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleRecordPayment()}
            disabled={loading || !amount || Number(amount) <= 0}
          >
            {loading && <Loader2Icon className="size-4 animate-spin" />}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
