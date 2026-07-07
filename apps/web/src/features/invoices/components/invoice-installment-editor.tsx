"use client";

import type { ReactNode } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/forms/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InvoiceInstallmentInput } from "@/lib/schemas/invoice";
import { formatMoney } from "@/lib/invoices";
import { cn } from "@/lib/utils";

export type InstallmentRow = InvoiceInstallmentInput;

type InvoiceInstallmentEditorProps = {
  installments: InstallmentRow[];
  onChange: (installments: InstallmentRow[]) => void;
  invoiceTotal: number;
  currency: string;
  disabled?: boolean;
};

const desktopGrid =
  "sm:grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_36px] sm:items-end sm:gap-2";

function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-xs font-medium text-muted-foreground", className)}>
      {children}
    </span>
  );
}

function createEmptyInstallment(sortOrder: number): InstallmentRow {
  return {
    dueDate: new Date().toISOString(),
    amount: 0,
    label: "",
    sortOrder,
  };
}

export function InvoiceInstallmentEditor({
  installments,
  onChange,
  invoiceTotal,
  currency,
  disabled = false,
}: InvoiceInstallmentEditorProps) {
  const scheduledTotal = installments.reduce((sum, row) => sum + row.amount, 0);
  const remaining = Math.round((invoiceTotal - scheduledTotal) * 100) / 100;

  function updateRow(index: number, patch: Partial<InstallmentRow>) {
    onChange(
      installments.map((row, i) =>
        i === index ? { ...row, ...patch, sortOrder: index } : { ...row, sortOrder: i },
      ),
    );
  }

  function addRow() {
    onChange([...installments, createEmptyInstallment(installments.length)]);
  }

  function removeRow(index: number) {
    onChange(
      installments
        .filter((_, i) => i !== index)
        .map((row, sortOrder) => ({ ...row, sortOrder })),
    );
  }

  function splitEvenly() {
    if (installments.length === 0) return;
    const count = installments.length;
    const base = Math.floor((invoiceTotal / count) * 100) / 100;
    let allocated = 0;
    onChange(
      installments.map((row, index) => {
        const isLast = index === count - 1;
        const amount = isLast
          ? Math.round((invoiceTotal - allocated) * 100) / 100
          : base;
        allocated += amount;
        return { ...row, amount, sortOrder: index };
      }),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>Payment schedule</Label>
          <p className="text-sm text-muted-foreground">
            Optional installments that sum to the invoice total.
          </p>
        </div>
        <div className="flex gap-2">
          {installments.length > 1 && (
            <Button type="button" variant="outline" size="sm" onClick={splitEvenly} disabled={disabled}>
              Split evenly
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled}>
            <PlusIcon className="size-4" />
            Add installment
          </Button>
        </div>
      </div>

      {installments.length > 0 && (
        <div className="space-y-3">
          <div className={cn("hidden px-0.5", desktopGrid)}>
            <FieldLabel>Label</FieldLabel>
            <FieldLabel>Due date</FieldLabel>
            <FieldLabel>Amount</FieldLabel>
            <span className="sr-only">Remove</span>
          </div>

          <div className="divide-y divide-border/50">
            {installments.map((row, index) => (
              <div
                key={index}
                className={cn("grid gap-3 py-3 first:pt-0 last:pb-0", desktopGrid)}
              >
                <div className="space-y-1">
                  <FieldLabel className="sm:sr-only">Label</FieldLabel>
                  <Input
                    id={`installment-label-${index}`}
                    value={row.label ?? ""}
                    onChange={(e) => updateRow(index, { label: e.target.value })}
                    placeholder={index === 0 ? "Deposit" : `Payment ${index + 1}`}
                    disabled={disabled}
                    aria-label={`Installment ${index + 1} label`}
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel className="sm:sr-only">Due date</FieldLabel>
                  <DatePicker
                    id={`installment-date-${index}`}
                    value={row.dueDate}
                    onChange={(value) => updateRow(index, { dueDate: value ?? row.dueDate })}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel className="sm:sr-only">Amount</FieldLabel>
                  <Input
                    id={`installment-amount-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.amount || ""}
                    onChange={(e) => updateRow(index, { amount: Number(e.target.value) })}
                    disabled={disabled}
                    aria-label={`Installment ${index + 1} amount`}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                    disabled={disabled}
                    aria-label="Remove installment"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              Scheduled: {formatMoney(scheduledTotal, currency)}
            </span>
            <span className={Math.abs(remaining) > 0.01 ? "text-destructive" : "text-muted-foreground"}>
              {Math.abs(remaining) > 0.01
                ? `${remaining > 0 ? "Remaining" : "Over by"}: ${formatMoney(Math.abs(remaining), currency)}`
                : "Matches invoice total"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
