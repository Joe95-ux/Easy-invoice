"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FormCard } from "@/components/forms/form-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClientForm } from "@/features/clients/components/client-form";
import type { ClientFinancialProfile } from "@/lib/clients/financial-profile";
import type { ClientInput } from "@/lib/schemas/client";
import { formatMoney } from "@/lib/invoices";
import { formatClientAddress } from "@/lib/clients";
import { formatPhoneForDisplay, toTelHref } from "@/lib/phone";
import { invoiceFromTimeUrl } from "@/lib/time-tracking/invoice-from-time";
import { FileTextIcon } from "lucide-react";

type ClientOverviewTabProps = {
  client: ClientFinancialProfile;
  saving: boolean;
  onSavingChange: (saving: boolean) => void;
  onUpdate: (data: ClientInput) => Promise<void>;
};

function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warning" | "success";
}) {
  const hintClass =
    tone === "warning"
      ? "text-warning-foreground dark:text-warning"
      : tone === "success"
        ? "text-success"
        : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className={`mt-1 text-xs ${hintClass}`}>{hint}</p>
    </div>
  );
}

function clientToInput(client: ClientFinancialProfile, notes: string): ClientInput {
  return {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    address: client.address ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    zip: client.zip ?? "",
    country: client.country ?? "US",
    notes,
    defaultHourlyRate: client.defaultHourlyRate,
  };
}

export function ClientOverviewTab({
  client,
  saving,
  onSavingChange,
  onUpdate,
}: ClientOverviewTabProps) {
  const { summary } = client;
  const address = formatClientAddress(client);
  const hasUnbilledTime = summary.unbilledEntryCount > 0;
  const [notes, setNotes] = useState(client.notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);

  useEffect(() => {
    setNotes(client.notes ?? "");
  }, [client.id, client.notes, client.updatedAt]);

  async function saveNotesIfChanged() {
    const next = notes.trimEnd();
    const current = (client.notes ?? "").trimEnd();
    if (next === current || notesSaving) return;

    setNotesSaving(true);
    try {
      await onUpdate(clientToInput(client, next));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save notes");
      setNotes(client.notes ?? "");
    } finally {
      setNotesSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {hasUnbilledTime && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="font-medium">
              {summary.unbilledHours.toFixed(2)} unbilled hours
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatMoney(summary.unbilledValue, summary.currency)} ready to add to an invoice
            </p>
          </div>
          <Button
            render={
              <Link
                href={invoiceFromTimeUrl({
                  clientId: client.id,
                  openPicker: true,
                })}
              />
            }
          >
            <FileTextIcon className="size-4" />
            Invoice unbilled time
          </Button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total billed"
          value={formatMoney(summary.totalBilled, summary.currency)}
          hint={`${summary.invoiceCount} invoice${summary.invoiceCount === 1 ? "" : "s"}`}
        />
        <SummaryCard
          label="Collected"
          value={formatMoney(summary.totalCollected, summary.currency)}
          hint="Lifetime payments received"
          tone="success"
        />
        <SummaryCard
          label="Outstanding"
          value={formatMoney(summary.outstanding, summary.currency)}
          hint={summary.outstanding > 0 ? "Awaiting payment" : "Nothing outstanding"}
          tone={summary.outstanding > 0 ? "warning" : "neutral"}
        />
        <SummaryCard
          label="Unbilled time"
          value={
            hasUnbilledTime
              ? `${summary.unbilledHours.toFixed(2)} hrs`
              : "—"
          }
          hint={
            hasUnbilledTime
              ? formatMoney(summary.unbilledValue, summary.currency)
              : "No billable hours waiting"
          }
          tone={hasUnbilledTime ? "warning" : "neutral"}
        />
        <SummaryCard
          label="Avg. days to pay"
          value={summary.avgDaysToPay !== null ? `${summary.avgDaysToPay} days` : "—"}
          hint={`${summary.estimateCount} estimate${summary.estimateCount === 1 ? "" : "s"}`}
        />
      </section>

      {(client.email || client.phone || address) && (
        <div className="rounded-xl border border-border p-4 text-sm">
          <p className="font-medium">Contact</p>
          <dl className="mt-3 space-y-2 text-muted-foreground">
            {client.email && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-foreground">Email</dt>
                <dd>
                  <a href={`mailto:${client.email}`} className="hover:text-foreground hover:underline">
                    {client.email}
                  </a>
                </dd>
              </div>
            )}
            {client.phone && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-foreground">Phone</dt>
                <dd>
                  <a
                    href={`tel:${toTelHref(client.phone) ?? client.phone}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {formatPhoneForDisplay(client.phone, { defaultCountry: client.country })}
                  </a>
                </dd>
              </div>
            )}
            {address && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-foreground">Address</dt>
                <dd>{address}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 text-sm ring-1 ring-foreground/10">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">Notes</p>
          <p className="text-xs text-muted-foreground">
            {notesSaving ? "Saving…" : "Saves when you leave the field"}
          </p>
        </div>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => void saveNotesIfChanged()}
          rows={4}
          disabled={notesSaving}
          placeholder="Preferred payment method, job history, etc."
          className="mt-3 resize-y border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <FormCard
        title="Client details"
        description="Update contact information used on invoices and estimates."
        footer={
          <Button type="submit" form="edit-client-form" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        }
      >
        <ClientForm
          key={`${client.id}-${client.updatedAt}`}
          formId="edit-client-form"
          showSubmit={false}
          onSubmittingChange={onSavingChange}
          initialValues={{
            name: client.name,
            email: client.email ?? "",
            phone: client.phone ?? "",
            address: client.address ?? "",
            city: client.city ?? "",
            state: client.state ?? "",
            zip: client.zip ?? "",
            country: client.country ?? "US",
            notes: client.notes ?? "",
            defaultHourlyRate: client.defaultHourlyRate,
          }}
          submitLabel="Save changes"
          onSubmit={onUpdate}
        />
      </FormCard>
    </div>
  );
}
