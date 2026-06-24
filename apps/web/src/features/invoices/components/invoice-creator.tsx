"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AiInvoiceTab } from "@/features/invoices/components/ai-invoice-tab";
import {
  InvoiceLineItems,
  type LineItemInput,
} from "@/features/invoices/components/invoice-line-items";
import { InvoiceTotalsSummary } from "@/features/invoices/components/invoice-totals-summary";
import { TemplatePicker } from "@/features/invoices/components/template-picker";
import { calculateInvoiceTotals } from "@/lib/calculator";
import type { ClientListItem } from "@/lib/clients";
import { formatClientAddress } from "@/lib/clients";
import type { InvoiceDraft } from "@/lib/schemas/invoice";
import type { TemplateSummary } from "@/lib/templates";

const emptyLineItem = (): LineItemInput => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
});

type InvoiceCreatorProps = {
  currency: string;
  clients?: ClientListItem[];
  templates?: TemplateSummary[];
  initialClientId?: string;
  defaultTemplateId?: string;
};

export function InvoiceCreator({
  currency: defaultCurrency,
  clients = [],
  templates = [],
  initialClientId,
  defaultTemplateId,
}: InvoiceCreatorProps) {
  const router = useRouter();
  const [selectedClientId, setSelectedClientId] = useState(initialClientId ?? "");
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? templates[0]?.id ?? "");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [lineItems, setLineItems] = useState<LineItemInput[]>([emptyLineItem()]);
  const [saving, setSaving] = useState(false);

  const totals = calculateInvoiceTotals({
    lineItems: lineItems.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    taxRate: taxRate / 100,
    discount,
  });

  function updateLineItem(index: number, patch: Partial<LineItemInput>) {
    setLineItems((items) =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function applyClient(client: ClientListItem) {
    setClientName(client.name);
    setClientEmail(client.email ?? "");
    setClientPhone(client.phone ?? "");
    setClientAddress(formatClientAddress(client));
  }

  function handleClientSelect(clientId: string) {
    setSelectedClientId(clientId);
    if (!clientId) return;

    const client = clients.find((c) => c.id === clientId);
    if (client) applyClient(client);
  }

  useEffect(() => {
    if (!initialClientId) return;
    const client = clients.find((c) => c.id === initialClientId);
    if (client) {
      setSelectedClientId(client.id);
      applyClient(client);
    }
  }, [initialClientId, clients]);

  function applyDraft(draft: InvoiceDraft) {
    setSelectedClientId("");
    setClientName(draft.client_name);
    setClientEmail(draft.client_email ?? "");
    setClientPhone(draft.client_phone ?? "");
    setClientAddress(draft.client_address ?? "");
    setNotes(draft.notes ?? "");
    setCurrency(draft.currency ?? defaultCurrency);
    setTaxRate((draft.tax_rate ?? 0) * 100);
    setDiscount(draft.discount ?? 0);
    if (draft.issue_date) setIssueDate(draft.issue_date.slice(0, 10));
    if (draft.due_date) setDueDate(draft.due_date.slice(0, 10));
    setLineItems(
      draft.line_items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId || undefined,
          templateId: templateId || undefined,
          clientName,
          clientEmail: clientEmail || undefined,
          clientPhone: clientPhone || undefined,
          clientAddress: clientAddress || undefined,
          notes,
          currency,
          issueDate: issueDate ? new Date(issueDate).toISOString() : undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          taxRate: taxRate / 100,
          discount,
          lineItems: lineItems.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sortOrder: index,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save invoice");

      toast.success("Invoice saved as draft.");
      router.push(`/invoices/${data.invoice.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Tabs defaultValue="form">
      <TabsList>
        <TabsTrigger value="form">Form</TabsTrigger>
        <TabsTrigger value="ai">Describe with AI</TabsTrigger>
      </TabsList>

      <TabsContent value="ai">
        <AiInvoiceTab onDraft={applyDraft} />
      </TabsContent>

      <TabsContent value="form">
        <Card>
          <CardHeader>
            <CardTitle>Invoice details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {templates.length > 0 && (
              <TemplatePicker
                templates={templates}
                value={templateId}
                onChange={setTemplateId}
              />
            )}

            {clients.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="existing-client">Existing client</Label>
                <NativeSelect
                  id="existing-client"
                  className="w-full"
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                >
                  <NativeSelectOption value="">Enter manually</NativeSelectOption>
                  {clients.map((client) => (
                    <NativeSelectOption key={client.id} value={client.id}>
                      {client.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-name">Client name</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email">Client email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Client phone</Label>
                <Input
                  id="client-phone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={currency}
                  maxLength={3}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue-date">Issue date</Label>
                <Input
                  id="issue-date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date">Due date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-address">Client address</Label>
              <Input
                id="client-address"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <InvoiceLineItems
              items={lineItems}
              onChange={updateLineItem}
              onAdd={() => setLineItems((items) => [...items, emptyLineItem()])}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  min={0}
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Discount</Label>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
            </div>

            <InvoiceTotalsSummary currency={currency} totals={totals} />

            <Button onClick={handleSave} disabled={saving || !clientName.trim()}>
              {saving ? "Saving..." : "Save draft"}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
