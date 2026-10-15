"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type VoidInvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
};

export function VoidInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
}: VoidInvoiceDialogProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVoid() {
    setLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      throwIfApiError(response, data, "Could not void invoice");
      toast.success("Invoice voided", {
        description: `Issued credit note ${data.creditNote?.number ?? ""}`.trim(),
      });
      onOpenChange(false);
      if (data.creditNote?.id) {
        router.push(`/credit-notes/${data.creditNote.id}`);
      }
      router.refresh();
    } catch (error) {
      toastApiError(error, "Could not void invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void {invoiceNumber}?</DialogTitle>
          <DialogDescription>
            This issues a credit note for the remaining unpaid amount. The original invoice stays
            in history as credited — it is not rewritten.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2">
          <Label htmlFor="void-reason">Reason</Label>
          <Textarea
            id="void-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Sent in error, work cancelled…"
            rows={3}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleVoid()} disabled={loading}>
            {loading ? "Voiding…" : "Void invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
