"use client";

import { useRouter } from "next/navigation";
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
import type { InvoiceStatus } from "@easy-invoice/db";

type InvoiceSendDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientEmail?: string | null;
  onSent?: () => void;
};

export function InvoiceSendDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  status,
  clientEmail,
  onSent,
}: InvoiceSendDialogProps) {
  const router = useRouter();
  const [email, setEmail] = useState(clientEmail ?? "");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) setEmail(clientEmail ?? "");
  }, [open, clientEmail]);

  const canSend = status !== "CANCELLED" && status !== "PAID";

  async function handleSend() {
    if (!email) return;
    setSending(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to send");

      toast.success(`Invoice sent to ${email}`);
      onOpenChange(false);
      onSent?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invoice");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send invoice</DialogTitle>
          <DialogDescription>
            Email {invoiceNumber} as a PDF attachment to your client.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2">
          <Label htmlFor="invoice-send-email">Client email</Label>
          <Input
            id="invoice-send-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="client@example.com"
            disabled={!canSend}
          />
          {!canSend && (
            <p className="text-xs text-muted-foreground">
              This invoice cannot be sent in its current status.
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!email || sending || !canSend}>
            {sending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
