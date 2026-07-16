"use client";

import { useState } from "react";
import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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

type BankModalState =
  | { open: false }
  | { open: true; label: string; index: number | null; details: BankDetailFields };

const EMPTY_BANK: BankDetailFields = {
  bankName: "",
  accountName: "",
  routingNumber: "",
  accountNumber: "",
};

function normalizeLabel(label: string) {
  return label.trim().toLowerCase();
}

function isLabelTaken(
  methods: CompanyPaymentMethod[],
  label: string,
  excludeIndex?: number | null,
) {
  const normalized = normalizeLabel(label);
  if (!normalized) return false;
  return methods.some(
    (method, index) =>
      index !== excludeIndex && normalizeLabel(method.label) === normalized,
  );
}

export function PaymentMethodsEditor({
  value,
  onChange,
  error,
}: PaymentMethodsEditorProps) {
  const [bankModal, setBankModal] = useState<BankModalState>({ open: false });

  function updateRow(index: number, patch: Partial<CompanyPaymentMethod>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addSimpleMethod(label = "", details = "") {
    if (value.length >= 12) {
      toast.error("You can add up to 12 payment methods");
      return;
    }
    if (label && isLabelTaken(value, label)) {
      toast.error(`${label} is already added`);
      return;
    }
    onChange([...value, { label, value: details }]);
  }

  function openBankModal(label: string, index: number | null = null) {
    if (index === null && isLabelTaken(value, label)) {
      toast.error(`${label} is already added`);
      return;
    }
    if (index === null && value.length >= 12) {
      toast.error("You can add up to 12 payment methods");
      return;
    }

    setBankModal({
      open: true,
      label,
      index,
      details:
        index !== null ? parseBankDetails(value[index]?.value ?? "") : { ...EMPTY_BANK },
    });
  }

  function handleSuggestion(suggestion: (typeof SUGGESTED_PAYMENT_METHODS)[number]) {
    if (isBankTransferMethod(suggestion.label)) {
      openBankModal(suggestion.label);
      return;
    }
    addSimpleMethod(suggestion.label, suggestion.value);
  }

  function handleMethodLabelChange(index: number, nextLabel: string) {
    if (isLabelTaken(value, nextLabel, index)) {
      toast.error(`“${nextLabel.trim()}” is already added`);
      return;
    }
    updateRow(index, { label: nextLabel });
  }

  function saveBankModal() {
    if (!bankModal.open) return;

    const serialized = serializeBankDetails(bankModal.details);
    if (!serialized) {
      toast.error("Add at least one bank detail");
      return;
    }
    if (isLabelTaken(value, bankModal.label, bankModal.index)) {
      toast.error(`${bankModal.label} is already added`);
      return;
    }

    if (bankModal.index !== null) {
      updateRow(bankModal.index, {
        label: bankModal.label,
        value: serialized,
      });
    } else {
      onChange([...value, { label: bankModal.label, value: serialized }]);
    }

    setBankModal({ open: false });
  }

  const availableSuggestions = SUGGESTED_PAYMENT_METHODS.filter(
    (method) => !isLabelTaken(value, method.label),
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Payment information</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Shown on invoices and estimates above Terms &amp; notes. Each method can only
          be added once.
        </p>
      </div>

      {value.length > 0 ? (
        <div className="max-md:space-y-3 md:border-y md:border-dashed md:border-border">
          {value.map((row, index) => {
            const isBank = isBankTransferMethod(row.label);
            const bankDetails = isBank ? parseBankDetails(row.value) : null;
            const filledBankFields = bankDetails
              ? BANK_DETAIL_FIELDS.filter((field) => bankDetails[field.key].trim())
              : [];
            const isLast = index === value.length - 1;

            return (
              <div
                key={`payment-method-${index}`}
                className={cn(
                  "max-md:rounded-lg max-md:border max-md:bg-muted/20 max-md:p-3",
                  "md:mb-0 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-4",
                  !isLast && "md:border-b md:border-dashed md:border-border",
                )}
              >
                {isBank && bankDetails ? (
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-3">
                      <p className="text-sm font-medium text-foreground">{row.label}</p>
                      {filledBankFields.length > 0 ? (
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                          {filledBankFields.map((field) => (
                            <div key={field.key} className="min-w-0">
                              <dt className="text-xs text-muted-foreground">{field.label}</dt>
                              <dd className="truncate text-sm font-medium">
                                {bankDetails[field.key]}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="text-sm text-muted-foreground">No details yet</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={`${row.label} actions`}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-36 w-40">
                        <DropdownMenuItem onClick={() => openBankModal(row.label, index)}>
                          <PencilIcon className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => removeRow(index)}
                        >
                          <Trash2Icon className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)] sm:items-end">
                      <div className="space-y-1.5">
                        <Label htmlFor={`payment-label-${index}`}>Method</Label>
                        <Input
                          id={`payment-label-${index}`}
                          value={row.label}
                          onChange={(event) =>
                            handleMethodLabelChange(index, event.target.value)
                          }
                          placeholder="PayPal"
                        />
                      </div>
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
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground md:rounded-none md:border-x-0 md:border-y md:border-dashed md:py-5 md:text-left">
          No payment methods yet. Add PayPal, Zelle, bank transfer, or another option
          clients can use.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addSimpleMethod()}>
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
            onClick={() => handleSuggestion(method)}
          >
            + {method.label}
          </Button>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Dialog
        open={bankModal.open}
        onOpenChange={(open) => {
          if (!open) setBankModal({ open: false });
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {bankModal.open && bankModal.index !== null
                ? `Edit ${bankModal.label}`
                : bankModal.open
                  ? `Add ${bankModal.label}`
                  : "Bank details"}
            </DialogTitle>
            <DialogDescription>
              These details appear on invoices and estimates. Fill in only the fields
              clients need.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {bankModal.open ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {BANK_DETAIL_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label htmlFor={`bank-modal-${field.key}`}>{field.label}</Label>
                    <Input
                      id={`bank-modal-${field.key}`}
                      value={bankModal.details[field.key]}
                      onChange={(event) =>
                        setBankModal({
                          ...bankModal,
                          details: {
                            ...bankModal.details,
                            [field.key]: event.target.value,
                          },
                        })
                      }
                      placeholder={field.placeholder}
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBankModal({ open: false })}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveBankModal}>
              {bankModal.open && bankModal.index !== null ? "Save changes" : "Add details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
