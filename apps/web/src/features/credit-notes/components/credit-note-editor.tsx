"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { throwIfApiError, toastApiError } from "@/lib/billing/plan-api-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/forms/date-picker";
import { formatMoney } from "@/lib/invoices";

type LineDraft = {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type InvoiceOption = {
  id: string;
  number: string;
  clientName: string | null;
  total: string;
  currency: string;
  status: string;
};

type LoadedInvoice = {
  id: string;
  number: string;
  currency: string;
  status: string;
  total: number;
  remainingInvoice: number;
  clientName: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
};

type CreditNoteEditorProps = {
  invoiceId?: string;
  creditNoteId?: string;
  initial?: {
    reason: string;
    notes: string;
    issueDate: string;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  };
};

function newKey() {
  return Math.random().toString(36).slice(2, 10);
}

export function CreditNoteEditor({ invoiceId, creditNoteId, initial }: CreditNoteEditorProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(invoiceId ?? "");
  const [invoice, setInvoice] = useState<LoadedInvoice | null>(null);
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [issueDate, setIssueDate] = useState(
    initial?.issueDate ?? new Date().toISOString().slice(0, 10),
  );
  const [lines, setLines] = useState<LineDraft[]>(
    initial?.lineItems.map((item) => ({
      key: newKey(),
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
    })) ?? [{ key: newKey(), description: "", quantity: "1", unitPrice: "0" }],
  );
  const [loadingInvoice, setLoadingInvoice] = useState(Boolean(invoiceId));
  const [saving, setSaving] = useState<"draft" | "issue" | null>(null);

  useEffect(() => {
    if (invoiceId) return;
    fetch("/api/invoices?pageSize=50&sortKey=createdAt&sortDir=desc")
      .then(async (response) => {
        const data = await response.json();
        throwIfApiError(response, data, "Could not load invoices");
        const rows = (data.rows ?? []) as Array<{
          id: string;
          number: string;
          clientName: string | null;
          total: string;
          currency: string;
          status: string;
        }>;
        setInvoices(
          rows.filter(
            (row) =>
              row.status !== "DRAFT" &&
              row.status !== "CANCELLED" &&
              row.status !== "CREDITED",
          ),
        );
      })
      .catch((error) => toastApiError(error, "Could not load invoices"));
  }, [invoiceId]);

  useEffect(() => {
    if (!selectedInvoiceId) return;
    setLoadingInvoice(true);
    fetch(`/api/invoices/${selectedInvoiceId}`)
      .then(async (response) => {
        const data = await response.json();
        throwIfApiError(response, data, "Could not load invoice");
        const next = data.invoice as {
          id: string;
          number: string;
          currency: string;
          status: string;
          total: { toString(): string } | number;
          client?: { name?: string | null } | null;
          payments?: Array<{ amount: { toString(): string } | number; kind?: string | null }>;
          creditNotes?: Array<{
            id?: string;
            total: { toString(): string } | number;
            status?: string | null;
          }>;
          items: Array<{
            description: string;
            quantity: { toString(): string } | number;
            unitPrice: { toString(): string } | number;
          }>;
        };
        const issuedCredits = (next.creditNotes ?? []).reduce((sum, note) => {
          if (note.status !== "ISSUED") return sum;
          if (creditNoteId && note.id === creditNoteId) return sum;
          return sum + Number(note.total);
        }, 0);
        const invoiceTotal = Number(next.total);
        setInvoice({
          id: next.id,
          number: next.number,
          currency: next.currency,
          status: next.status,
          total: invoiceTotal,
          remainingInvoice: Math.max(0, Math.round((invoiceTotal - issuedCredits) * 100) / 100),
          clientName: next.client?.name ?? null,
          items: next.items.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        });
        if (!creditNoteId && !initial) {
          setLines(
            next.items.map((item) => ({
              key: newKey(),
              description: item.description,
              quantity: String(item.quantity),
              unitPrice: String(item.unitPrice),
            })),
          );
        }
      })
      .catch((error) => toastApiError(error, "Could not load invoice"))
      .finally(() => setLoadingInvoice(false));
  }, [selectedInvoiceId, creditNoteId, initial]);

  const draftTotal = useMemo(() => {
    return Math.round(
      lines.reduce((sum, line) => {
        const qty = Number(line.quantity);
        const price = Number(line.unitPrice);
        if (!Number.isFinite(qty) || !Number.isFinite(price)) return sum;
        return sum + qty * price;
      }, 0) * 100,
    ) / 100;
  }, [lines]);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  async function save(issue: boolean) {
    const lineItems = lines
      .map((line, index) => ({
        description: line.description.trim(),
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        sortOrder: index,
      }))
      .filter((line) => line.description && line.quantity > 0);

    if (!selectedInvoiceId) {
      toast.error("Choose an invoice to credit");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Add at least one credit line");
      return;
    }
    if (invoice && draftTotal > invoice.remainingInvoice + 0.001) {
      toast.error(
        `Credit cannot exceed the remaining invoice amount (${formatMoney(invoice.remainingInvoice, invoice.currency)})`,
      );
      return;
    }

    setSaving(issue ? "issue" : "draft");
    try {
      if (creditNoteId) {
        const updateResponse = await fetch(`/api/credit-notes/${creditNoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, notes, issueDate, lineItems }),
        });
        const updateData = await updateResponse.json().catch(() => ({}));
        throwIfApiError(updateResponse, updateData, "Could not save credit note");
        if (issue) {
          const issueResponse = await fetch(`/api/credit-notes/${creditNoteId}/issue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ issueDate }),
          });
          const issueData = await issueResponse.json().catch(() => ({}));
          throwIfApiError(issueResponse, issueData, "Could not issue credit note");
        }
        toast.success(issue ? "Credit note issued" : "Draft saved");
        router.push(`/credit-notes/${creditNoteId}`);
        router.refresh();
        return;
      }

      const response = await fetch("/api/credit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          reason,
          notes,
          issueDate,
          lineItems,
          issue,
        }),
      });
      const data = await response.json().catch(() => ({}));
      throwIfApiError(response, data, "Could not save credit note");
      toast.success(issue ? "Credit note issued" : "Draft saved");
      router.push(`/credit-notes/${data.creditNote.id}`);
      router.refresh();
    } catch (error) {
      toastApiError(error, "Could not save credit note");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
          <CardDescription>
            Credits reduce what is still owed on the original invoice. Sent history stays intact.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoiceId ? (
            <p className="text-sm">
              {invoice ? (
                <>
                  <span className="font-medium">{invoice.number}</span>
                  {invoice.clientName ? ` · ${invoice.clientName}` : ""}
                  {` · ${formatMoney(invoice.total, invoice.currency)}`}
                </>
              ) : loadingInvoice ? (
                "Loading invoice…"
              ) : (
                "Invoice"
              )}
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="credit-invoice">Invoice to credit</Label>
              <select
                id="credit-invoice"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedInvoiceId}
                onChange={(event) => setSelectedInvoiceId(event.target.value)}
              >
                <option value="">Select an invoice</option>
                {invoices.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.number}
                    {row.clientName ? ` · ${row.clientName}` : ""} · {row.currency} {row.total}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="credit-reason">Reason</Label>
              <Input
                id="credit-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Returned items, billing correction…"
              />
            </div>
            <div className="space-y-2">
              <Label>Issue date</Label>
              <DatePicker value={issueDate} onChange={setIssueDate} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="credit-notes">Notes</Label>
            <Textarea
              id="credit-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Credit lines</CardTitle>
            <CardDescription>Adjust quantities or amounts to credit part of the invoice.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setLines((current) => [
                ...current,
                { key: newKey(), description: "", quantity: "1", unitPrice: "0" },
              ])
            }
          >
            <PlusIcon className="size-4" />
            Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line) => (
            <div key={line.key} className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem_auto]">
              <Input
                value={line.description}
                onChange={(event) => updateLine(line.key, { description: event.target.value })}
                placeholder="Description"
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={line.quantity}
                onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={line.unitPrice}
                onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove line"
                disabled={lines.length === 1}
                onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-col items-end gap-1 pt-2 text-sm">
            {invoice ? (
              <p className="text-muted-foreground">
                Remaining on invoice {formatMoney(invoice.remainingInvoice, invoice.currency)}
              </p>
            ) : null}
            <p
              className={
                invoice && draftTotal > invoice.remainingInvoice + 0.001
                  ? "font-medium text-destructive"
                  : "font-medium"
              }
            >
              Credit total {formatMoney(draftTotal, invoice?.currency ?? "USD")}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={saving !== null}
          onClick={() => void save(false)}
        >
          {saving === "draft" ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Save draft
        </Button>
        <Button
          type="button"
          disabled={
            saving !== null || Boolean(invoice && draftTotal > invoice.remainingInvoice + 0.001)
          }
          onClick={() => void save(true)}
        >
          {saving === "issue" ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Issue credit note
        </Button>
      </div>
    </div>
  );
}
