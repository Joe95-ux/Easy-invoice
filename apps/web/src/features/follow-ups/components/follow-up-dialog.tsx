"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/forms/date-picker";
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
import { Textarea } from "@/components/ui/textarea";
import type { SerializedFollowUp } from "@/lib/follow-ups/service";

export type FollowUpLinkOption = {
  id: string;
  label: string;
  clientId?: string | null;
};

type FollowUpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: FollowUpLinkOption[];
  invoices: FollowUpLinkOption[];
  estimates: FollowUpLinkOption[];
  /** Prefill when opened from an invoice/estimate page. */
  defaults?: {
    title?: string;
    dueDate?: string | null;
    clientId?: string | null;
    invoiceId?: string | null;
    estimateId?: string | null;
  };
  /** When set, hides the link-type picker and keeps the document locked. */
  lockLink?: "invoice" | "estimate" | "client";
  /** Set false when the parent shows its own success toast. */
  showSuccessToast?: boolean;
  onCreated: (followUp: SerializedFollowUp) => void;
};

type LinkKind = "invoice" | "estimate" | "client";

export function FollowUpDialog({
  open,
  onOpenChange,
  clients,
  invoices,
  estimates,
  defaults,
  lockLink,
  showSuccessToast = true,
  onCreated,
}: FollowUpDialogProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [linkKind, setLinkKind] = useState<LinkKind>("invoice");
  const [clientId, setClientId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [estimateId, setEstimateId] = useState("");
  const [saving, setSaving] = useState(false);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setTitle(defaults?.title ?? "");
      setNotes("");
      setDueDate(defaults?.dueDate ?? "");
      setClientId(defaults?.clientId ?? "");
      setInvoiceId(defaults?.invoiceId ?? "");
      setEstimateId(defaults?.estimateId ?? "");
      setLinkKind(
        lockLink ??
          (defaults?.invoiceId ? "invoice" : defaults?.estimateId ? "estimate" : "invoice"),
      );
    }
    wasOpen.current = open;
  }, [open, defaults, lockLink]);

  const selectedInvoice = useMemo(
    () => invoices.find((item) => item.id === invoiceId),
    [invoices, invoiceId],
  );
  const selectedEstimate = useMemo(
    () => estimates.find((item) => item.id === estimateId),
    [estimates, estimateId],
  );

  const canSubmit =
    Boolean(title.trim()) &&
    (linkKind === "invoice"
      ? Boolean(invoiceId)
      : linkKind === "estimate"
        ? Boolean(estimateId)
        : Boolean(clientId));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Add a title");
      return;
    }

    if (!canSubmit) {
      toast.error("Link a client, invoice, or estimate");
      return;
    }

    const payload = {
      title: title.trim(),
      notes: notes.trim() || null,
      dueDate: dueDate || null,
      clientId:
        linkKind === "client"
          ? clientId || null
          : linkKind === "invoice"
            ? selectedInvoice?.clientId ?? clientId ?? null
            : selectedEstimate?.clientId ?? clientId ?? null,
      invoiceId: linkKind === "invoice" ? invoiceId || null : null,
      estimateId: linkKind === "estimate" ? estimateId || null : null,
    };

    if (!payload.clientId && !payload.invoiceId && !payload.estimateId) {
      toast.error("Link a client, invoice, or estimate");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Could not create follow-up");
      }
      onCreated(data.followUp as SerializedFollowUp);
      onOpenChange(false);
      if (showSuccessToast) {
        toast.success("Follow-up added");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create follow-up");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>Add follow-up</DialogTitle>
            <DialogDescription>
              Track the next billing action on a client, invoice, or estimate.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="follow-up-title">Title</Label>
              <Input
                id="follow-up-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Call about payment"
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="follow-up-due">Due date</Label>
              <DatePicker
                id="follow-up-due"
                value={dueDate || undefined}
                onChange={setDueDate}
                placeholder="Optional"
              />
            </div>

            {!lockLink ? (
              <div className="grid gap-2">
                <Label>Linked to</Label>
                <Select
                  value={linkKind}
                  onValueChange={(value) => value && setLinkKind(value as LinkKind)}
                  items={[
                    { value: "invoice", label: "Invoice" },
                    { value: "estimate", label: "Estimate" },
                    { value: "client", label: "Client" },
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="estimate">Estimate</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {linkKind === "invoice" ? (
              <div className="grid gap-2">
                <Label>Invoice</Label>
                {lockLink === "invoice" && selectedInvoice ? (
                  <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                    {selectedInvoice.label}
                  </p>
                ) : invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoices yet.</p>
                ) : (
                  <Select
                    value={invoiceId || undefined}
                    onValueChange={(value) => value && setInvoiceId(value)}
                    items={invoices.map((invoice) => ({
                      value: invoice.id,
                      label: invoice.label,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {invoice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : null}

            {linkKind === "estimate" ? (
              <div className="grid gap-2">
                <Label>Estimate</Label>
                {lockLink === "estimate" && selectedEstimate ? (
                  <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                    {selectedEstimate.label}
                  </p>
                ) : estimates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No estimates yet.</p>
                ) : (
                  <Select
                    value={estimateId || undefined}
                    onValueChange={(value) => value && setEstimateId(value)}
                    items={estimates.map((estimate) => ({
                      value: estimate.id,
                      label: estimate.label,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select estimate" />
                    </SelectTrigger>
                    <SelectContent>
                      {estimates.map((estimate) => (
                        <SelectItem key={estimate.id} value={estimate.id}>
                          {estimate.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : null}

            {linkKind === "client" ? (
              <div className="grid gap-2">
                <Label>Client</Label>
                {clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clients yet.</p>
                ) : (
                  <Select
                    value={clientId || undefined}
                    onValueChange={(value) => value && setClientId(value)}
                    items={clients.map((client) => ({
                      value: client.id,
                      label: client.label,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="follow-up-notes">Notes</Label>
              <Textarea
                id="follow-up-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional context"
                rows={3}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !canSubmit}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Add follow-up
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
