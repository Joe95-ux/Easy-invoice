"use client";

import {
  RecurringScheduleDrawer,
  type RecurringInvoiceOption,
} from "@/features/recurring-invoices/components/recurring-schedule-drawer";
import type { SerializedRecurringInvoice } from "@/lib/recurring-invoices-shared";

type MakeRecurringDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  clientName?: string | null;
  clientEmail?: string | null;
  currency?: string;
  onCreated: (recurringInvoiceId: string) => void;
};

/** Schedule rules for an existing invoice (right drawer). */
export function MakeRecurringDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  clientName,
  clientEmail,
  currency = "USD",
  onCreated,
}: MakeRecurringDrawerProps) {
  const invoice: RecurringInvoiceOption = {
    id: invoiceId,
    number: invoiceNumber,
    clientId: null,
    clientName: clientName ?? null,
    clientEmail: clientEmail ?? null,
  };

  return (
    <RecurringScheduleDrawer
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      invoices={[invoice]}
      currency={currency}
      preselectedInvoiceId={invoiceId}
      onSaved={(row: SerializedRecurringInvoice) => onCreated(row.id)}
    />
  );
}
