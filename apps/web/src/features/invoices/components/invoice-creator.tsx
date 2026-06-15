"use client";

import { useState } from "react";
import { calculateInvoiceTotals, lineItemAmount } from "@/lib/calculator";
import type { InvoiceDraft } from "@/lib/schemas/invoice";

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

const emptyLineItem = (): LineItem => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
});

type InvoiceCreatorProps = {
  companyId: string;
  currency: string;
};

export function InvoiceCreator({ companyId, currency }: InvoiceCreatorProps) {
  const [mode, setMode] = useState<"form" | "ai">("form");
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);
  const [aiText, setAiText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const totals = calculateInvoiceTotals({
    lineItems: lineItems.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    taxRate: taxRate / 100,
    discount,
  });

  function updateLineItem(index: number, patch: Partial<LineItem>) {
    setLineItems((items) =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function applyDraft(draft: InvoiceDraft) {
    setClientName(draft.client_name);
    setNotes(draft.notes ?? "");
    setTaxRate((draft.tax_rate ?? 0) * 100);
    setDiscount(draft.discount ?? 0);
    setLineItems(
      draft.line_items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
    );
    setMode("form");
    setMessage("AI draft applied — review before saving.");
  }

  async function handleParse() {
    setParsing(true);
    setMessage(null);
    try {
      const response = await fetch("/api/ai/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      if (!response.ok) throw new Error("Failed to parse invoice text");
      const draft = (await response.json()) as InvoiceDraft;
      applyDraft(draft);
    } catch {
      setMessage("Could not parse that description. Try again or use the form.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          clientName,
          notes,
          currency,
          taxRate: taxRate / 100,
          discount,
          lineItems: lineItems.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: lineItemAmount(item.quantity, item.unitPrice),
            sortOrder: index,
          })),
          ...totals,
        }),
      });
      if (!response.ok) throw new Error("Failed to save invoice");
      setMessage("Invoice saved as draft.");
      setClientName("");
      setNotes("");
      setLineItems([emptyLineItem()]);
    } catch {
      setMessage("Could not save invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <TabButton active={mode === "form"} onClick={() => setMode("form")}>
          Form
        </TabButton>
        <TabButton active={mode === "ai"} onClick={() => setMode("ai")}>
          Describe with AI
        </TabButton>
      </div>

      {mode === "ai" ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <label className="block text-sm font-medium">
            Describe the job (any language)
          </label>
          <textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            rows={6}
            placeholder="Example: Fixed Maria's kitchen sink, 2 hours at $85/hr, parts $45, due in 14 days..."
            className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleParse}
            disabled={parsing || !aiText.trim()}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {parsing ? "Parsing..." : "Parse with AI"}
          </button>
        </section>
      ) : (
        <section className="space-y-4 rounded-xl border border-border bg-card p-6">
          <Field label="Client name" value={clientName} onChange={setClientName} />
          <Field label="Notes" value={notes} onChange={setNotes} />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Line items</span>
              <button
                type="button"
                onClick={() => setLineItems((items) => [...items, emptyLineItem()])}
                className="text-sm text-primary"
              >
                + Add line
              </button>
            </div>
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-4">
                  <input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, { description: e.target.value })}
                    className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) =>
                      updateLineItem(index, { quantity: Number(e.target.value) })
                    }
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Rate"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateLineItem(index, { unitPrice: Number(e.target.value) })
                    }
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Tax rate (%)"
              value={String(taxRate)}
              onChange={(v) => setTaxRate(Number(v))}
              type="number"
            />
            <Field
              label="Discount"
              value={String(discount)}
              onChange={(v) => setDiscount(Number(v))}
              type="number"
            />
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>
                {currency} {totals.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Tax</span>
              <span>
                {currency} {totals.taxAmount.toFixed(2)}
              </span>
            </div>
            <div className="mt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>
                {currency} {totals.total.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !clientName.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save draft"}
          </button>
        </section>
      )}

      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        active ? "bg-primary text-primary-foreground" : "border border-border bg-card"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
