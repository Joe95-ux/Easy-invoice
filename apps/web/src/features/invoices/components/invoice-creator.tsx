"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EyeIcon, ClockIcon, PackageIcon } from "lucide-react";
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
import { PhoneInput } from "@/components/forms/phone-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AiDocumentParseTab } from "@/features/invoices/components/ai-document-parse-tab";
import { AddFromLibraryDialog } from "@/features/products/components/add-from-library-dialog";
import { AddUnbilledTimeDialog } from "@/features/time/components/add-unbilled-time-dialog";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import {
  InvoiceLineItems,
  appendItemsToLastSection,
  createDefaultSections,
  lineItemHasContent,
  type LineItemInput,
  type LineItemSectionInput,
} from "@/features/invoices/components/invoice-line-items";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { InvoiceTotalsSummary } from "@/features/invoices/components/invoice-totals-summary";
import {
  InvoiceInstallmentEditor,
  type InstallmentRow,
} from "@/features/invoices/components/invoice-installment-editor";
import { TemplateCarousel } from "@/features/invoices/components/template-carousel";
import {
  calculateInvoiceTotals,
  calculateLineSubtotal,
  resolveDiscountAmount,
  type DiscountMode,
} from "@/lib/calculator";
import { validateInstallments } from "@/lib/invoice-payments-utils";
import { throwIfApiError, toastApiError } from "@/lib/billing/plan-api-error";
import type { ClientListItem } from "@/lib/clients";
import { formatClientAddress } from "@/lib/clients";
import { CURRENCY_OPTIONS } from "@/lib/geo/countries";
import { normalizeDraftDate } from "@/lib/draft-dates";
import type { InvoiceStatus } from "@easy-invoice/db";
import {
  flattenSectionsToLineItems,
  groupLineItemsIntoSections,
} from "@/lib/line-item-sections";
import type { AiApplyMeta, InvoiceDraft } from "@/lib/schemas/invoice";
import { AiSourceNotesPanel } from "@/features/invoices/components/ai-source-notes-panel";
import type { TemplateSummary } from "@/lib/templates";

const BASE_STEPS: FormStep[] = [
  { id: "template", title: "Template", description: "Pick a design for this invoice." },
  { id: "client", title: "Client", description: "Who you're billing for this invoice." },
  { id: "details", title: "Details", description: "Dates and currency for this invoice." },
  { id: "items", title: "Line items", description: "Sections and line items for this invoice." },
  { id: "notes", title: "Notes", description: "Due dates, late fees, or anything else to include." },
];

export type InvoiceInitialValues = {
  clientId?: string | null;
  templateId?: string | null;
  clientName?: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAddress?: string | null;
  notes?: string | null;
  currency?: string;
  issueDate?: string;
  dueDate?: string | null;
  taxRate?: number;
  discount?: number;
  lineItems?: Array<
    LineItemInput & {
      sectionTitle?: string | null;
      sectionSortOrder?: number;
    }
  >;
  installments?: InstallmentRow[];
};

type InvoiceCreatorProps = {
  title?: string;
  description?: string;
  currency: string;
  company: PreviewCompany;
  clients?: ClientListItem[];
  templates?: TemplateSummary[];
  initialClientId?: string;
  initialProjectId?: string;
  defaultTemplateId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  invoiceStatus?: InvoiceStatus;
  initialValues?: InvoiceInitialValues;
  autoOpenTimeDialog?: boolean;
  preselectedTimeEntryIds?: string[];
  preselectedExpenseIds?: string[];
};

export function InvoiceCreator({
  title = "New invoice",
  description = "Use the form or describe the job in your own words.",
  currency: defaultCurrency,
  company,
  clients = [],
  templates = [],
  initialClientId,
  initialProjectId,
  defaultTemplateId,
  invoiceId,
  invoiceNumber,
  invoiceStatus,
  initialValues,
  autoOpenTimeDialog = false,
  preselectedTimeEntryIds = [],
  preselectedExpenseIds = [],
}: InvoiceCreatorProps) {
  const router = useRouter();
  const [activeInvoiceId, setActiveInvoiceId] = useState(invoiceId);
  const [leaveAfterSave, setLeaveAfterSave] = useState(false);
  const isEditing = Boolean(activeInvoiceId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState(
    initialValues?.clientId ?? initialClientId ?? "",
  );
  const [projectId] = useState(initialProjectId ?? "");
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
  const [dueDate, setDueDate] = useState(initialValues?.dueDate?.slice(0, 10) ?? "");
  const [taxRate, setTaxRate] = useState(
    initialValues?.taxRate !== undefined ? initialValues.taxRate * 100 : 0,
  );
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [discountValue, setDiscountValue] = useState(initialValues?.discount ?? 0);
  const [sections, setSections] = useState<LineItemSectionInput<LineItemInput>[]>(() => {
    if (initialValues?.lineItems?.length) {
      return groupLineItemsIntoSections(initialValues.lineItems);
    }
    return createDefaultSections();
  });
  const [installments, setInstallments] = useState<InstallmentRow[]>(
    initialValues?.installments ?? [],
  );
  const [activeTab, setActiveTab] = useState("form");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [aiSourceNotes, setAiSourceNotes] = useState<string | null>(null);

  const canAddFromTime =
    Boolean(selectedClientId) && (!isEditing || invoiceStatus === "DRAFT");

  const isDirty = useMemo(() => {
    if (isEditing || leaveAfterSave) return false;
    return Boolean(
      selectedClientId ||
        clientName.trim() ||
        clientEmail.trim() ||
        clientPhone.trim() ||
        clientAddress.trim() ||
        notes.trim() ||
        taxRate !== 0 ||
        discountValue !== 0 ||
        installments.length > 0 ||
        aiSourceNotes ||
        sections.some(
          (section) =>
            section.title.trim() || section.items.some(lineItemHasContent),
        ),
    );
  }, [
    isEditing,
    leaveAfterSave,
    selectedClientId,
    clientName,
    clientEmail,
    clientPhone,
    clientAddress,
    notes,
    taxRate,
    discountValue,
    installments.length,
    aiSourceNotes,
    sections,
  ]);

  const {
    leaveDialogOpen,
    confirmLeave,
    cancelLeave,
    allowNextNavigation,
  } = useUnsavedChangesGuard({ enabled: isDirty && !saving });

  const steps = useMemo(
    () => (templates.length > 0 ? BASE_STEPS : BASE_STEPS.filter((s) => s.id !== "template")),
    [templates.length],
  );
  const currentStepId = steps[step]?.id;
  const isLastStep = step === steps.length - 1;

  const lineItems = useMemo(
    () => flattenSectionsToLineItems(sections),
    [sections],
  );
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
    if (initialValues || isEditing) return;
    if (!initialClientId) return;
    const client = clients.find((c) => c.id === initialClientId);
    if (client) {
      setSelectedClientId(client.id);
      applyClient(client);
    }
  }, [initialClientId, clients, initialValues, isEditing]);

  const itemsStepIndex = useMemo(() => steps.findIndex((s) => s.id === "items"), [steps]);
  const preselectedTimeIdsKey = useMemo(
    () => preselectedTimeEntryIds.join(","),
    [preselectedTimeEntryIds],
  );
  const preselectedExpenseIdsKey = useMemo(
    () => preselectedExpenseIds.join(","),
    [preselectedExpenseIds],
  );

  useEffect(() => {
    if (isEditing || !autoOpenTimeDialog || !selectedClientId || itemsStepIndex < 0) return;
    setStep(itemsStepIndex);
    setTimeDialogOpen(true);
  }, [isEditing, autoOpenTimeDialog, selectedClientId, itemsStepIndex]);

  useEffect(() => {
    if (isEditing || !preselectedTimeIdsKey || !selectedClientId || itemsStepIndex < 0) return;
    setStep(itemsStepIndex);
  }, [isEditing, preselectedTimeIdsKey, selectedClientId, itemsStepIndex]);

  useEffect(() => {
    if (isEditing || !preselectedExpenseIdsKey || itemsStepIndex < 0) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/expenses?ids=${encodeURIComponent(preselectedExpenseIdsKey)}`,
        );
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Failed to load expenses");
        if (cancelled) return;

        const expenses = (body.expenses ?? []) as Array<{
          id: string;
          description: string;
          amount: number;
        }>;
        if (expenses.length === 0) return;

        const items: LineItemInput[] = expenses.map((expense) => ({
          description: expense.description,
          quantity: 1,
          unitPrice: expense.amount,
          expenseIds: [expense.id],
        }));

        setSections((current) => {
          const usedIds = new Set(
            current.flatMap((section) =>
              section.items.flatMap((item) => item.expenseIds ?? []),
            ),
          );
          const freshItems = items.filter(
            (item) => !item.expenseIds?.some((id) => usedIds.has(id)),
          );
          if (freshItems.length === 0) return current;
          return appendItemsToLastSection(current, freshItems);
        });
        setStep(itemsStepIndex);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load expenses");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEditing, preselectedExpenseIdsKey, itemsStepIndex]);

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
        if (due) setDueDate(due);
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

    setSections(
      draft.sections.map((section) => ({
        key: crypto.randomUUID(),
        title: section.title?.trim() ?? "",
        items: section.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
        })),
      })),
    );
    setActiveTab("form");
    setStep(
      steps.findIndex((s) => s.id === (linesOnly ? "items" : "client")) ||
        0,
    );
  }

  function handleAddFromTime(items: LineItemInput[]): boolean {
    let added = false;

    setSections((current) => {
      const usedIds = new Set(
        current.flatMap((section) =>
          section.items.flatMap((item) => item.timeEntryIds ?? []),
        ),
      );
      const freshItems = items
        .map((item) => ({
          ...item,
          timeEntryIds: item.timeEntryIds?.filter((id) => !usedIds.has(id)),
        }))
        .filter((item) => (item.timeEntryIds?.length ?? 0) > 0);

      if (freshItems.length === 0) {
        toast.error("Those hours are already on this invoice");
        return current;
      }

      added = true;
      return appendItemsToLastSection(current, freshItems);
    });

    return added;
  }

  function handleAddFromLibrary(items: LineItemInput[]) {
    setSections((current) => appendItemsToLastSection(current, items));
  }

  function buildPayload() {
    return {
      clientId: selectedClientId || undefined,
      projectId: projectId || undefined,
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
      discount: discountAmount,
      lineItems: flattenSectionsToLineItems(sections).map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sortOrder: item.sortOrder,
        sectionTitle: item.sectionTitle,
        sectionSortOrder: item.sectionSortOrder,
        ...(item.timeEntryIds?.length ? { timeEntryIds: item.timeEntryIds } : {}),
        ...(item.expenseIds?.length ? { expenseIds: item.expenseIds } : {}),
      })),
      ...(installments.length > 0 ? { installments } : {}),
    };
  }

  async function handleSave(downloadAfter = false) {
    if (installments.length > 0) {
      const installmentError = validateInstallments(installments, totals.total);
      if (installmentError) {
        toast.error(installmentError);
        return;
      }
    }

    setSaving(true);
    try {
      const creating = !invoiceId;
      const url = activeInvoiceId ? `/api/invoices/${activeInvoiceId}` : "/api/invoices";
      const response = await fetch(url, {
        method: activeInvoiceId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await response.json();
      if (!response.ok) {
        throwIfApiError(response, data, "Failed to save invoice");
      }

      const id = activeInvoiceId ?? data.invoice.id;

      allowNextNavigation();
      setLeaveAfterSave(true);
      if (!activeInvoiceId) {
        setActiveInvoiceId(id);
      }

      if (!creating) {
        toast.success("Invoice updated");
        router.push(`/invoices/${id}`);
        router.refresh();
        return;
      }

      toast.success(
        downloadAfter ? "Invoice created — opening download…" : "Invoice created",
      );
      window.location.assign(
        downloadAfter ? `/invoices/${id}?download=pdf` : `/invoices/${id}`,
      );
    } catch (error) {
      setLeaveAfterSave(false);
      toastApiError(error, "Could not save invoice.");
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadOnly() {
    if (!activeInvoiceId) return;
    allowNextNavigation();
    setLeaveAfterSave(true);
    window.location.assign(`/invoices/${activeInvoiceId}?download=pdf`);
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
          kind="invoice"
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
            <PhoneInput
              id="client-phone"
              label="Client phone"
              value={clientPhone}
              country={
                clients.find((c) => c.id === selectedClientId)?.country ||
                company.country ||
                "US"
              }
              onChange={setClientPhone}
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
            <FieldLabel htmlFor="due-date">Due date</FieldLabel>
            <FieldContent>
              <DatePicker
                id="due-date"
                value={dueDate}
                onChange={setDueDate}
                placeholder="Select due date"
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
          <div className="sm:col-span-2">
            <InvoiceInstallmentEditor
              installments={installments}
              onChange={setInstallments}
              invoiceTotal={totals.total}
              currency={currency}
              disabled={isEditing && invoiceStatus !== "DRAFT"}
            />
          </div>
        </div>
      )}

      {currentStepId === "items" && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLibraryDialogOpen(true)}
            >
              <PackageIcon className="size-4" />
              Add from library
            </Button>
            {canAddFromTime ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setTimeDialogOpen(true)}
              >
                <ClockIcon className="size-4" />
                Add from unbilled time
              </Button>
            ) : null}
          </div>
          <FormSection title="Line items">
            <InvoiceLineItems
              sections={sections}
              onChange={setSections}
              currency={currency}
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
              placeholder="e.g. Payment due in 14 days. Late fees or net terms..."
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
            <Button onClick={() => handleSave(false)} disabled={saving || !clientName.trim()}>
              {saving
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save changes"
                  : "Create invoice"}
            </Button>
            {!invoiceId && !activeInvoiceId && (
              <Button
                variant="outline"
                onClick={() => handleSave(true)}
                disabled={saving || !clientName.trim()}
              >
                {saving ? "Creating..." : "Create & download PDF"}
              </Button>
            )}
            {!invoiceId && activeInvoiceId && (
              <Button
                variant="outline"
                onClick={handleDownloadOnly}
                disabled={saving}
              >
                Download PDF
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
      kind="invoice"
      company={company}
      templateSlug={previewTemplate?.slug}
      templateName={previewTemplate?.name}
      isSelected={previewTemplate?.id === templateId}
      onUseTemplate={() => {
        if (previewTemplate) setTemplateId(previewTemplate.id);
        setPreviewTemplateId(null);
      }}
      number={invoiceNumber ?? "DRAFT"}
      client={{
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        address: clientAddress,
      }}
      issueDate={issueDate}
      expiryDate={dueDate}
      currency={currency}
      notes={notes}
      items={lineItems}
      totals={totals}
      taxRate={taxRate}
      discount={discountAmount}
      installments={installments}
    />
  );

  const timeDialog = canAddFromTime ? (
    <AddUnbilledTimeDialog
      open={timeDialogOpen}
      onOpenChange={setTimeDialogOpen}
      clientId={selectedClientId}
      clientName={clientName || clients.find((c) => c.id === selectedClientId)?.name || "Client"}
      currency={currency}
      onAdd={handleAddFromTime}
      initialSelectedIds={
        preselectedTimeEntryIds.length > 0 ? preselectedTimeEntryIds : undefined
      }
    />
  ) : null;

  const libraryDialog = (
    <AddFromLibraryDialog
      open={libraryDialogOpen}
      onOpenChange={setLibraryDialogOpen}
      currency={currency}
      onAdd={handleAddFromLibrary}
    />
  );

  const leaveDialog = (
    <UnsavedChangesDialog
      open={leaveDialogOpen}
      onOpenChange={(open) => {
        if (!open) cancelLeave();
      }}
      onConfirmLeave={confirmLeave}
      title="Leave invoice?"
      description="You have an unfinished invoice. If you leave now, your progress will be lost."
    />
  );

  if (isEditing) {
    return (
      <>
        <FormCard footer={formFooter}>{formBody}</FormCard>
        {previewDrawer}
        {timeDialog}
        {libraryDialog}
        {leaveDialog}
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
            variant="invoice"
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
      {timeDialog}
      {libraryDialog}
      {leaveDialog}
    </Tabs>
  );
}
