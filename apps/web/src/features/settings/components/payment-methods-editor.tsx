"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SUGGESTED_PAYMENT_LABELS,
  type CompanyPaymentMethod,
} from "@/lib/company-payment-methods";

type PaymentMethodsEditorProps = {
  value: CompanyPaymentMethod[];
  onChange: (value: CompanyPaymentMethod[]) => void;
  error?: string;
};

export function PaymentMethodsEditor({
  value,
  onChange,
  error,
}: PaymentMethodsEditorProps) {
  function updateRow(index: number, patch: Partial<CompanyPaymentMethod>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addRow(label = "") {
    if (value.length >= 12) return;
    onChange([...value, { label, value: "" }]);
  }

  function addSuggested(label: string) {
    if (value.some((row) => row.label.toLowerCase() === label.toLowerCase())) return;
    addRow(label);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Payment information</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Shown on invoices and estimates above Terms &amp; notes — one method per line.
          Stripe can be added later.
        </p>
      </div>

      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((row, index) => (
            <div
              key={`payment-method-${index}`}
              className="grid gap-2 sm:grid-cols-[minmax(7rem,10rem)_1fr_auto] sm:items-end"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`payment-label-${index}`}>Method</Label>
                <Input
                  id={`payment-label-${index}`}
                  value={row.label}
                  onChange={(event) => updateRow(index, { label: event.target.value })}
                  placeholder="PayPal"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`payment-value-${index}`}>Details</Label>
                <Input
                  id={`payment-value-${index}`}
                  value={row.value}
                  onChange={(event) => updateRow(index, { value: event.target.value })}
                  placeholder="email, phone, or bank details"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(index)}
                aria-label={`Remove ${row.label || "payment method"}`}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addRow()}>
          <PlusIcon className="size-4" />
          Add payment method
        </Button>
        {SUGGESTED_PAYMENT_LABELS.filter(
          (label) => !value.some((row) => row.label.toLowerCase() === label.toLowerCase()),
        )
          .slice(0, 4)
          .map((label) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => addSuggested(label)}
            >
              + {label}
            </Button>
          ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
