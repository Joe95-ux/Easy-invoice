"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  InvoiceLineItems,
  createDefaultSections,
  type LineItemInput,
} from "@/features/invoices/components/invoice-line-items";
import {
  RecurringScheduleFields,
  type RecurringScheduleFormState,
} from "@/features/recurring-invoices/components/recurring-schedule-fields";
import {
  flattenSectionsToLineItems,
  groupLineItemsIntoSections,
  type LineItemSectionInput,
} from "@/lib/line-item-sections";
import { frequencyLabel, localDateOnly } from "@/lib/recurring-invoices-shared";
import type { SerializedRecurringInvoice } from "@/lib/recurring-invoices-shared";

export type RecurringInvoiceOption = {
  id: string;
  number: string;
  clientId: string | null;
  clientName: string | null;
  clientEmail: string | null;
};

export type RecurringClientOption = {
  id: string;
  name: string;
  email: string | null;
};

type RecurringScheduleDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Create: pick an invoice and set schedule rules. Edit: update rules + template lines. */
  mode: "create" | "edit";
  invoices?: RecurringInvoiceOption[];
  clients?: RecurringClientOption[];
  currency: string;
  editing?: SerializedRecurringInvoice | null;
  /** When creating from an invoice detail/list action, skip the picker. */
  preselectedInvoiceId?: string | null;
  onSaved: (row: SerializedRecurringInvoice) => void;
};

function firstValidationMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const fieldErrors = (details as { fieldErrors?: Record<string, string[] | undefined> })
    .fieldErrors;
  if (!fieldErrors) return null;
  for (const messages of Object.values(fieldErrors)) {
    if (messages?.[0]) return messages[0];
  }
  return null;
}

function defaultScheduleState(
  clientName?: string | null,
  invoiceNumber?: string,
): RecurringScheduleFormState {
  const today = localDateOnly();
  return {
    name: clientName
      ? `${frequencyLabel("MONTHLY", 1)} – ${clientName}`
      : invoiceNumber
        ? `Recurring from ${invoiceNumber}`
        : "",
    frequency: "MONTHLY",
    interval: "1",
    startDate: today,
    nextIssueDate: today,
    endDate: "",
    maxOccurrences: "",
    dueDaysAfterIssue: "14",
    autoSend: false,
  };
}

export function RecurringScheduleDrawer({
  open,
  onOpenChange,
  mode,
  invoices = [],
  clients = [],
  currency,
  editing = null,
  preselectedInvoiceId = null,
  onSaved,
}: RecurringScheduleDrawerProps) {
  const isEdit = mode === "edit";
  const [schedule, setSchedule] = useState<RecurringScheduleFormState>(defaultScheduleState());
  const [invoiceId, setInvoiceId] = useState("");
  const [clientId, setClientId] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [sections, setSections] =
    useState<LineItemSectionInput<LineItemInput>[]>(createDefaultSections());
  const [saving, setSaving] = useState(false);
  const [popupContainer, setPopupContainer] = useState<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  const invoiceOptions = useMemo(
    () =>
      invoices.map((invoice) => ({
        value: invoice.id,
        label: invoice.clientName
          ? `${invoice.number} · ${invoice.clientName}`
          : invoice.number,
      })),
    [invoices],
  );

  const clientItems = useMemo(
    () => clients.map((client) => ({ value: client.id, label: client.name })),
    [clients],
  );

  const selectedInvoice = invoices.find((invoice) => invoice.id === invoiceId);
  const selectedClient = clients.find((client) => client.id === clientId);
  const canAutoSend = isEdit
    ? Boolean(selectedClient?.email?.trim() || editing?.client.email?.trim())
    : Boolean(selectedInvoice?.clientEmail?.trim());

  useEffect(() => {
    if (open && !wasOpen.current) {
      if (isEdit && editing) {
        setSchedule({
          name: editing.name,
          frequency: editing.frequency,
          interval: String(editing.interval),
          startDate: editing.startDate,
          nextIssueDate: editing.nextIssueDate,
          endDate: editing.endDate ?? "",
          maxOccurrences:
            editing.maxOccurrences != null ? String(editing.maxOccurrences) : "",
          dueDaysAfterIssue: String(editing.dueDaysAfterIssue),
          autoSend: editing.autoSend,
        });
        setClientId(editing.client.id);
        setTaxRatePercent(String(Number((editing.taxRate * 100).toFixed(4))));
        setDiscount(String(editing.discount));
        setNotes(editing.notes ?? "");
        const grouped = groupLineItemsIntoSections(
          editing.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sortOrder: item.sortOrder,
            sectionTitle: item.sectionTitle,
            sectionSortOrder: item.sectionSortOrder,
          })),
        );
        setSections(
          grouped.length > 0
            ? grouped.map((section) => ({
                ...section,
                items: section.items.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                })),
              }))
            : createDefaultSections(),
        );
      } else {
        const preselected =
          (preselectedInvoiceId &&
            invoices.find((invoice) => invoice.id === preselectedInvoiceId)) ||
          null;
        setInvoiceId(preselected?.id ?? "");
        setSchedule(
          defaultScheduleState(preselected?.clientName, preselected?.number),
        );
        setClientId("");
        setTaxRatePercent("0");
        setDiscount("0");
        setNotes("");
        setSections(createDefaultSections());
      }
    }
    wasOpen.current = open;
  }, [open, isEdit, editing, preselectedInvoiceId, invoices]);

  function patchSchedule(patch: Partial<RecurringScheduleFormState>) {
    setSchedule((prev) => ({ ...prev, ...patch }));
  }

  function handleInvoiceChange(nextId: string) {
    setInvoiceId(nextId);
    const invoice = invoices.find((row) => row.id === nextId);
    if (!invoice) return;
    setSchedule((prev) => ({
      ...prev,
      name:
        prev.name.trim() && !prev.name.startsWith("Recurring from")
          ? prev.name
          : defaultScheduleState(invoice.clientName, invoice.number).name,
      autoSend: prev.autoSend && Boolean(invoice.clientEmail?.trim()),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsedInterval = Number(schedule.interval);
    const parsedDueDays = Number(schedule.dueDaysAfterIssue);
    const parsedMax = schedule.maxOccurrences.trim()
      ? Number(schedule.maxOccurrences)
      : null;

    if (!schedule.name.trim()) {
      toast.error("Add a schedule name");
      return;
    }
    if (!Number.isInteger(parsedInterval) || parsedInterval < 1) {
      toast.error("Repeat every must be a whole number of 1 or more");
      return;
    }
    if (!Number.isInteger(parsedDueDays) || parsedDueDays < 0) {
      toast.error("Payment due days must be zero or more");
      return;
    }
    if (parsedMax != null && (!Number.isInteger(parsedMax) || parsedMax < 1)) {
      toast.error("Max invoices must be a whole number of 1 or more");
      return;
    }
    if (schedule.nextIssueDate < schedule.startDate) {
      toast.error("Next issue date must be on or after the start date");
      return;
    }
    if (schedule.endDate.trim() && schedule.endDate.trim() < schedule.nextIssueDate) {
      toast.error("End date must be on or after the next issue date");
      return;
    }
    if (schedule.autoSend && !canAutoSend) {
      toast.error("Add a client email before enabling auto-send");
      return;
    }

    if (!isEdit) {
      if (!invoiceId) {
        toast.error("Select an invoice to base this schedule on");
        return;
      }

      setSaving(true);
      try {
        const res = await fetch(`/api/invoices/${invoiceId}/make-recurring`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: schedule.name.trim(),
            frequency: schedule.frequency,
            interval: parsedInterval,
            startDate: schedule.startDate,
            nextIssueDate: schedule.startDate,
            endDate: schedule.endDate.trim() || null,
            maxOccurrences: parsedMax,
            dueDaysAfterIssue: parsedDueDays,
            autoSend: schedule.autoSend,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            firstValidationMessage(data.details) ??
              data.error ??
              "Could not create schedule",
          );
        }
        toast.success("Recurring schedule created", {
          description: "Future invoices copy this invoice’s client, lines, and totals.",
        });
        onSaved(data.recurringInvoice as SerializedRecurringInvoice);
        onOpenChange(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create schedule");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!editing) return;
    if (!clientId) {
      toast.error("Select a client");
      return;
    }

    const parsedTaxPercent = Number(taxRatePercent);
    const parsedDiscount = Number(discount);
    if (!Number.isFinite(parsedTaxPercent) || parsedTaxPercent < 0 || parsedTaxPercent > 100) {
      toast.error("Tax rate must be between 0 and 100");
      return;
    }
    if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0) {
      toast.error("Discount must be zero or more");
      return;
    }

    const lineItems = flattenSectionsToLineItems(sections).filter(
      (item) => item.description.trim() && item.quantity > 0,
    );
    if (lineItems.length === 0) {
      toast.error("Add at least one line item with a description");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/recurring-invoices/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: schedule.name.trim(),
          clientId,
          frequency: schedule.frequency,
          interval: parsedInterval,
          startDate: schedule.startDate,
          nextIssueDate: schedule.nextIssueDate,
          endDate: schedule.endDate.trim() || null,
          maxOccurrences: parsedMax,
          dueDaysAfterIssue: parsedDueDays,
          autoSend: schedule.autoSend,
          currency: editing.currency,
          taxRate: parsedTaxPercent / 100,
          discount: parsedDiscount,
          notes: notes.trim() || null,
          lineItems,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          firstValidationMessage(data.details) ?? data.error ?? "Could not save schedule",
        );
      }
      toast.success("Schedule updated");
      onSaved(data.recurringInvoice as SerializedRecurringInvoice);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save schedule");
    } finally {
      setSaving(false);
    }
  }

  const hideInvoicePicker = Boolean(preselectedInvoiceId) && !isEdit;

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="data-[vaul-drawer-direction=right]:h-full data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-lg">
        <div ref={setPopupContainer} />
        <DrawerHeader className="border-b">
          <DrawerTitle>
            {isEdit ? "Edit recurring schedule" : "New recurring schedule"}
          </DrawerTitle>
          <DrawerDescription>
            {isEdit
              ? "Update how often invoices are created, and the line items used for future invoices."
              : "Choose an existing invoice as the template, then set how often new invoices should be created."}
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {!isEdit && !hideInvoicePicker ? (
              invoices.length === 0 ? (
                <div className="rounded-[10px] border border-dashed px-4 py-6 text-center">
                  <p className="text-sm font-medium">Create an invoice first</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recurring schedules copy client, line items, and totals from an existing
                    invoice—same as QuickBooks and FreshBooks.
                  </p>
                  <Button className="mt-4" render={<Link href="/invoices/new" />}>
                    New invoice
                  </Button>
                </div>
              ) : (
                <SearchableSelect
                  id="recurring-source-invoice"
                  label="Base invoice"
                  value={invoiceId}
                  options={invoiceOptions}
                  onChange={handleInvoiceChange}
                  placeholder="Select invoice…"
                  description="Client, line items, tax, and notes are copied from this invoice."
                  container={popupContainer}
                />
              )
            ) : null}

            {!isEdit && hideInvoicePicker && selectedInvoice ? (
              <div className="rounded-[10px] border bg-muted/20 px-3 py-2.5 text-sm">
                <p className="font-medium">{selectedInvoice.number}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedInvoice.clientName
                    ? `Template from ${selectedInvoice.clientName}`
                    : "Line items and totals will be copied from this invoice."}
                </p>
              </div>
            ) : null}

            {isEdit ? (
              <SearchableSelect
                id="recurring-client"
                label="Client"
                value={clientId}
                options={clientItems}
                onChange={(value) => {
                  setClientId(value);
                  const next = clients.find((client) => client.id === value);
                  if (schedule.autoSend && !next?.email?.trim()) {
                    patchSchedule({ autoSend: false });
                  }
                }}
                placeholder="Select client…"
                container={popupContainer}
              />
            ) : null}

            <RecurringScheduleFields
              value={schedule}
              onChange={patchSchedule}
              showNextIssueDate={isEdit}
              canAutoSend={canAutoSend}
            />

            {isEdit ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="recurring-tax">Tax %</Label>
                    <Input
                      id="recurring-tax"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={taxRatePercent}
                      onChange={(e) => setTaxRatePercent(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recurring-discount">
                      Discount ({editing?.currency ?? currency})
                    </Label>
                    <Input
                      id="recurring-discount"
                      type="number"
                      min={0}
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Line items</Label>
                  <p className="text-xs text-muted-foreground">
                    Used for invoices generated from this schedule going forward.
                  </p>
                  <InvoiceLineItems
                    sections={sections}
                    onChange={setSections}
                    currency={editing?.currency ?? currency}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurring-notes">Notes (optional)</Label>
                  <Textarea
                    id="recurring-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    maxLength={5000}
                  />
                </div>
              </>
            ) : null}
          </div>

          <DrawerFooter className="border-t sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                saving ||
                (!isEdit && invoices.length === 0 && !preselectedInvoiceId)
              }
            >
              {saving ? <Loader2Icon className="animate-spin" /> : null}
              {isEdit ? "Save changes" : "Create schedule"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
