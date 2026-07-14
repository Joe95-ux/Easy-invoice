"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BANK_DETAIL_FIELDS,
  SUGGESTED_PAYMENT_METHODS,
  isBankTransferMethod,
  parseBankDetails,
  serializeBankDetails,
  type BankDetailFields,
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

  function addRow(label = "", details = "") {
    if (value.length >= 12) return;
    onChange([...value, { label, value: details }]);
  }

  function addSuggested(suggestion: (typeof SUGGESTED_PAYMENT_METHODS)[number]) {
    if (value.some((row) => row.label.toLowerCase() === suggestion.label.toLowerCase())) {
      return;
    }
    addRow(suggestion.label, suggestion.value);
  }

  function updateBankField(
    index: number,
    key: keyof BankDetailFields,
    fieldValue: string,
  ) {
    const current = parseBankDetails(value[index]?.value ?? "");
    updateRow(index, {
      value: serializeBankDetails({ ...current, [key]: fieldValue }),
    });
  }

  const availableSuggestions = SUGGESTED_PAYMENT_METHODS.filter(
    (method) => !value.some((row) => row.label.toLowerCase() === method.label.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Payment information</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Shown on invoices and estimates above Terms &amp; notes. PayPal and Zelle use a
          single field; bank and wire transfers use structured account details.
        </p>
      </div>

      {value.length > 0 && (
        <div className="space-y-4">
          {value.map((row, index) => {
            const isBank = isBankTransferMethod(row.label);
            const bankDetails = isBank ? parseBankDetails(row.value) : null;

            return (
              <div
                key={`payment-method-${index}`}
                className="rounded-lg border bg-muted/20 p-3 sm:p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="space-y-1.5 sm:max-w-xs">
                      <Label htmlFor={`payment-label-${index}`}>Method</Label>
                      <Input
                        id={`payment-label-${index}`}
                        value={row.label}
                        onChange={(event) =>
                          updateRow(index, { label: event.target.value })
                        }
                        placeholder="PayPal"
                      />
                    </div>

                    {isBank && bankDetails ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {BANK_DETAIL_FIELDS.map((field) => (
                          <div key={field.key} className="space-y-1.5">
                            <Label htmlFor={`payment-${field.key}-${index}`}>
                              {field.label}
                            </Label>
                            <Input
                              id={`payment-${field.key}-${index}`}
                              value={bankDetails[field.key]}
                              onChange={(event) =>
                                updateBankField(index, field.key, event.target.value)
                              }
                              placeholder={field.placeholder}
                              autoComplete="off"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label htmlFor={`payment-value-${index}`}>Details</Label>
                        <Input
                          id={`payment-value-${index}`}
                          value={row.value}
                          onChange={(event) =>
                            updateRow(index, { value: event.target.value })
                          }
                          placeholder="email, phone, or handle"
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(index)}
                    aria-label={`Remove ${row.label || "payment method"}`}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addRow()}>
          <PlusIcon className="size-4" />
          Add payment method
        </Button>
        {availableSuggestions.map((method) => (
          <Button
            key={method.label}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => addSuggested(method)}
          >
            + {method.label}
          </Button>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
