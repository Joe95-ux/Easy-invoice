"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EyeIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell/page-header";
import {
  DocumentPreviewDrawer,
  type PreviewCompany,
} from "@/components/document-preview-drawer";
import { DiscountField } from "@/components/forms/discount-field";
import { DatePicker } from "@/components/forms/date-picker";
import { FormCard } from "@/components/forms/form-card";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { FormStepProgress, type FormStep } from "@/components/forms/form-step-progress";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AiDocumentParseTab } from "@/features/invoices/components/ai-document-parse-tab";
import {
  InvoiceLineItems,
  createDefaultLineItems,
  createEmptyLineItem,
  type LineItemInput,
} from "@/features/invoices/components/invoice-line-items";
import { InvoiceTotalsSummary } from "@/features/invoices/components/invoice-totals-summary";
import { TemplateCarousel } from "@/features/invoices/components/template-carousel";
import {
  calculateInvoiceTotals,
  calculateLineSubtotal,
  resolveDiscountAmount,
  type DiscountMode,
} from "@/lib/calculator";
import type { ClientListItem } from "@/lib/clients";
import { formatClientAddress } from "@/lib/clients";
import { CURRENCY_OPTIONS } from "@/lib/geo/countries";
import { normalizeDraftDate } from "@/lib/draft-dates";
import type { AiApplyMeta, InvoiceDraft } from "@/lib/schemas/invoice";
import { AiSourceNotesPanel } from "@/features/invoices/components/ai-source-notes-panel";
import type { TemplateSummary } from "@/lib/templates";

const BASE_STEPS: FormStep[] = [
  { id: "template", title: "Template", description: "Pick a design for this estimate." },
  { id: "client", title: "Client", description: "Who this estimate is for." },
  { id: "details", title: "Details", description: "Dates and currency for this estimate." },
  { id: "items", title: "Line items", description: "Products or services on this estimate." },
  { id: "notes", title: "Notes", description: "Validity terms or anything else to include." },
];

export type EstimateInitialValues = {
  clientId?: string | null;
  templateId?: string | null;
  clientName?: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAddress?: string | null;
  notes?: string | null;
  currency?: string;
  issueDate?: string;
  validUntil?: string | null;
  taxRate?: number;
  discount?: number;
  lineItems?: LineItemInput[];
};

type EstimateCreatorProps = {
  title?: string;
  description?: string;
  currency: string;
  company: PreviewCompany;
  clients?: ClientListItem[];
  templates?: TemplateSummary[];
  initialClientId?: string;
  defaultTemplateId?: string;
  estimateId?: string;
  estimateNumber?: string;
  initialValues?: EstimateInitialValues;
};

export function EstimateCreator({
  title = "New estimate",
  description = "Use the form or describe the job in your own words.",
  currency: defaultCurrency,
  company,
  clients = [],
  templates = [],
  initialClientId,
  defaultTemplateId,
  estimateId,
  estimateNumber,
  initialValues,
}: EstimateCreatorProps) {
  const router = useRouter();
  const isEditing = Boolean(estimateId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState(
    initialValues?.clientId ?? initialClientId ?? "",
  );
  const [templateId, setTemplateId] = useState(
    initialValues?.templateId ?? defaultTemplateId ?? templates[0]?.id ?? "",
  );
  const [clientName, setClientName] = useState(initialValues?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(initialValues?.clientEmail ?? "");
  const [clientPhone, setClientPhone] = useState(initialValues?.clientPhone ?? "");
  const [clientAddress, setClientAddress] = useState(initialValues?.clientAddress ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [currency, setCurrency] = useState(initialValues?.currency ?? defaultCurrency);
  const [issueDate, setIssueDate] = useState(
    initialValues?.issueDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [validUntil, setValidUntil] = useState(
    initialValues?.validUntil?.slice(0, 10) ?? "",
  );
  const [taxRate, setTaxRate] = useState(
    initialValues?.taxRate !== undefined ? initialValues.taxRate * 100 : 0,
  );
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [discountValue, setDiscountValue] = useState(initialValues?.discount ?? 0);
  const [lineItems, setLineItems] = useState<LineItemInput[]>(
    initialValues?.lineItems?.length ? initialValues.lineItems : createDefaultLineItems(),
  );
  const [activeTab, setActiveTab] = useState("form");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [aiSourceNotes, setAiSourceNotes] = useState<string | null>(null);

  const steps = useMemo(
    () => (templates.length > 0 ? BASE_STEPS : BASE_STEPS.filter((s) => s.id !== "template")),
    [templates.length],
  );
  const currentStepId = steps[step]?.id;
  const isLastStep = step === steps.length - 1;

  const lineItemsForTotals = lineItems.map((item) => ({
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
  const subtotal = calculateLineSubtotal(lineItemsForTotals);
  const discountAmount = resolveDiscountAmount(subtotal, discountMode, discountValue);
  const totals = calculateInvoiceTotals({
    lineItems: lineItemsForTotals,
    taxRate: taxRate / 100,
    discount: discountAmount,
  });

  const clientItems = useMemo(
    () => [
      { value: "__manual__", label: "Enter manually" },
      ...clients.map((client) => ({ value: client.id, label: client.name })),
    ],
    [clients],
  );

  const currencyItems = useMemo(
    () => CURRENCY_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    [],
  );

  const activePreviewTemplateId = previewTemplateId ?? templateId;
  const previewTemplate = useMemo(
    () => templates.find((template) => template.id === activePreviewTemplateId),
    [templates, activePreviewTemplateId],
  );

  function openOwnPreview() {
    setPreviewTemplateId(null);
    setPreviewOpen(true);
  }

  function openTemplatePreview(id: string) {
    setPreviewTemplateId(id);
    setPreviewOpen(true);
  }

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
    if (initialValues || !initialClientId) return;
    const client = clients.find((c) => c.id === initialClientId);
    if (client) {
      setSelectedClientId(client.id);
      applyClient(client);
    }
  }, [initialClientId, clients, initialValues]);

  function removeLineItem(index: number) {
    setLineItems((items) =>
      items.length === 1 ? items : items.filter((_, i) => i !== index),
    );
  }

  function applyDraft(draft: InvoiceDraft, meta?: AiApplyMeta) {
    const linesOnly = meta?.extraction_mode === "lines_only";

    if (meta?.sourceNotes?.trim()) {
      setAiSourceNotes(meta.sourceNotes.trim());
    }

    if (!linesOnly) {
      setSelectedClientId("");
      setClientName(draft.client_name);
      setClientEmail(draft.client_email ?? "");
      setClientPhone(draft.client_phone ?? "");
      setClientAddress(draft.client_address ?? "");
      setNotes(draft.notes ?? "");
      setCurrency(draft.currency ?? defaultCurrency);
      setTaxRate((draft.tax_rate ?? 0) * 100);
      setDiscountMode("amount");
      setDiscountValue(draft.discount ?? 0);
      if (draft.issue_date) {
        const issue = normalizeDraftDate(draft.issue_date);
        if (issue) setIssueDate(issue);
      }
      if (draft.due_date) {
        const due = normalizeDraftDate(draft.due_date);
        if (due) setValidUntil(due);
      }
    } else {
      if (draft.notes) {
        setNotes((current) => (current.trim() ? `${current.trim()}\n${draft.notes}` : draft.notes ?? ""));
      }
      if ((draft.tax_rate ?? 0) > 0) {
        setTaxRate((draft.tax_rate ?? 0) * 100);
      }
      if ((draft.discount ?? 0) > 0) {
        setDiscountMode("amount");
        setDiscountValue(draft.discount ?? 0);
      }
    }

    setLineItems(
      draft.line_items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      })),
    );
    setActiveTab("form");
    setStep(
      steps.findIndex((s) => s.id === (linesOnly ? "items" : "client")) ||
        0,
    );
  }

  function buildPayload() {
    return {
      clientId: selectedClientId || undefined,
      templateId: templateId || undefined,
      clientName,
      clientEmail: clientEmail || undefined,
      clientPhone: clientPhone || undefined,
      clientAddress: clientAddress || undefined,
      notes,
      currency,
      issueDate: issueDate ? new Date(issueDate).toISOString() : undefined,
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      taxRate: taxRate / 100,
      discount: discountAmount,
      lineItems: lineItems.map((item, index) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sortOrder: index,
      })),
    };
  }

  async function handleSave(downloadAfter = false) {
    setSaving(true);
    try {
      const url = isEditing ? `/api/estimates/${estimateId}` : "/api/estimates";
      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save estimate");

      const id = isEditing ? estimateId! : data.estimate.id;

      if (isEditing) {
        toast.success("Estimate updated");
        router.push(`/estimates/${id}`);
      } else {
        toast.success("Estimate created");

        if (downloadAfter) {
          router.push(`/estimates/${id}?download=pdf`);
          return;
        }

        router.push(`/estimates/${id}`);
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save estimate.");
    } finally {
      setSaving(false);
    }
  }

  const formBody = (
    <div className="space-y-6">
      <FormStepProgress steps={steps} step={step} onStepChange={setStep} />

      {aiSourceNotes && (
        <AiSourceNotesPanel notes={aiSourceNotes} onDismiss={() => setAiSourceNotes(null)} />
      )}

      {currentStepId === "template" && (
        <TemplateCarousel
          templates={templates}
          value={templateId}
          onChange={setTemplateId}
          onPreview={openTemplatePreview}
          kind="estimate"
          company={company}
          currency={currency}
        />
      )}

      {currentStepId === "client" && (
        <div className="space-y-4">
          {clients.length > 0 && (
            <SearchableSelect
              id="existing-client"
              label="Existing client"
              value={selectedClientId || "__manual__"}
              options={clientItems}
              onChange={(value) => handleClientSelect(value === "__manual__" ? "" : value)}
              placeholder="Select a saved client"
              description="Pick a saved client to auto-fill their details, or enter them manually below."
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Client name"
              id="client-name"
              value={clientName}
              onChange={setClientName}
              required
              placeholder="Client or company name"
            />
            <FormField
              label="Client email"
              id="client-email"
              type="email"
              value={clientEmail}
              onChange={setClientEmail}
              placeholder="client@example.com"
            />
            <FormField
              label="Client phone"
              id="client-phone"
              value={clientPhone}
              onChange={setClientPhone}
              placeholder="Phone number"
            />
            <FormField
              label="Client address"
              id="client-address"
              value={clientAddress}
              onChange={setClientAddress}
              placeholder="Billing address"
            />
          </div>
        </div>
      )}

      {currentStepId === "details" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="issue-date">Issue date</FieldLabel>
            <FieldContent>
              <DatePicker
                id="issue-date"
                value={issueDate}
                onChange={setIssueDate}
                placeholder="Select issue date"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="valid-until">Valid until</FieldLabel>
            <FieldContent>
              <DatePicker
                id="valid-until"
                value={validUntil}
                onChange={setValidUntil}
                placeholder="Select valid until date"
              />
            </FieldContent>
          </Field>
          <SearchableSelect
            id="currency"
            label="Currency"
            value={currency}
            options={currencyItems}
            onChange={(value) => value && setCurrency(value)}
            placeholder="Select currency"
          />
        </div>
      )}

      {currentStepId === "items" && (
        <div className="space-y-4">
          <FormSection title="Line items">
            <InvoiceLineItems
              items={lineItems}
              onChange={updateLineItem}
              onRemove={removeLineItem}
              onAdd={() => setLineItems((items) => [...items, createEmptyLineItem()])}
            />
          </FormSection>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="tax-rate" className="h-[26px] items-center">
                Tax rate (%)
              </FieldLabel>
              <FieldContent>
                <Input
                  id="tax-rate"
                  type="number"
                  min={0}
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </FieldContent>
            </Field>
            <DiscountField
              mode={discountMode}
              value={discountValue}
              currency={currency}
              onModeChange={setDiscountMode}
              onValueChange={setDiscountValue}
            />
          </div>
          <InvoiceTotalsSummary currency={currency} totals={totals} discount={discountAmount} />
        </div>
      )}

      {currentStepId === "notes" && (
        <Field>
          <FieldLabel htmlFor="notes">Terms &amp; notes</FieldLabel>
          <FieldContent>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Validity terms, project details, or additional notes..."
            />
          </FieldContent>
        </Field>
      )}
    </div>
  );

  const formFooter = (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <div className="flex gap-2">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => setStep((value) => value - 1)}
          >
            Back
          </Button>
        )}
        {!isLastStep && (
          <Button type="button" disabled={saving} onClick={() => setStep((value) => value + 1)}>
            Continue
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {isLastStep && (
          <>
            <Button type="button" variant="outline" onClick={openOwnPreview}>
              <EyeIcon className="size-4" />
              Preview
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={saving || !clientName.trim()}
            >
              {saving
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save changes"
                  : "Create estimate"}
            </Button>
            {!isEditing && (
              <Button
                variant="outline"
                onClick={() => handleSave(true)}
                disabled={saving || !clientName.trim()}
              >
                {saving ? "Creating..." : "Create & download PDF"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );

  const previewDrawer = (
    <DocumentPreviewDrawer
      open={previewOpen}
      onOpenChange={setPreviewOpen}
      kind="estimate"
      company={company}
      templateSlug={previewTemplate?.slug}
      templateName={previewTemplate?.name}
      isSelected={previewTemplate?.id === templateId}
      onUseTemplate={() => {
        if (previewTemplate) setTemplateId(previewTemplate.id);
        setPreviewTemplateId(null);
      }}
      number={estimateNumber ?? "DRAFT"}
      client={{
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        address: clientAddress,
      }}
      issueDate={issueDate}
      expiryDate={validUntil}
      currency={currency}
      notes={notes}
      items={lineItems}
      totals={totals}
      taxRate={taxRate}
      discount={discountAmount}
    />
  );

  if (isEditing) {
    return (
      <>
        <FormCard footer={formFooter}>{formBody}</FormCard>
        {previewDrawer}
      </>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <PageHeader
        title={title}
        description={description}
        actions={
          <TabsList variant="segment" className="w-full sm:w-auto">
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="ai">Describe with AI</TabsTrigger>
          </TabsList>
        }
      />

      <TabsContent value="ai">
        <FormCard>
          <AiDocumentParseTab
            variant="estimate"
            onDraft={applyDraft}
            knownClientName={clientName || undefined}
            preferLinesOnly={Boolean(selectedClientId || clientName.trim())}
          />
        </FormCard>
      </TabsContent>

      <TabsContent value="form">
        <FormCard footer={formFooter}>{formBody}</FormCard>
      </TabsContent>

      {previewDrawer}
    </Tabs>
  );
}
