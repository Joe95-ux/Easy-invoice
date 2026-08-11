import type {
  RecurringFrequency,
  RecurringInvoiceStatus,
} from "@easy-invoice/db";

export type SerializedRecurringLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  sortOrder: number;
  sectionTitle: string | null;
  sectionSortOrder: number;
};

export type SerializedRecurringInvoice = {
  id: string;
  name: string;
  status: RecurringInvoiceStatus;
  frequency: RecurringFrequency;
  interval: number;
  startDate: string;
  nextIssueDate: string;
  endDate: string | null;
  maxOccurrences: number | null;
  occurrenceCount: number;
  dueDaysAfterIssue: number;
  autoSend: boolean;
  currency: string;
  taxRate: number;
  discount: number;
  notes: string | null;
  templateId: string | null;
  sourceInvoiceId: string | null;
  lastIssuedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    email: string | null;
  };
  items: SerializedRecurringLineItem[];
  /** Estimated total for one occurrence (subtotal − discount + tax). */
  estimatedTotal: number;
  invoicesCount?: number;
};

export function frequencyLabel(frequency: RecurringFrequency, interval = 1): string {
  const unit =
    frequency === "WEEKLY"
      ? interval === 1
        ? "week"
        : "weeks"
      : frequency === "MONTHLY"
        ? interval === 1
          ? "month"
          : "months"
        : frequency === "QUARTERLY"
          ? interval === 1
            ? "quarter"
            : "quarters"
          : interval === 1
            ? "year"
            : "years";
  return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}`;
}

export function recurringStatusLabel(status: RecurringInvoiceStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function recurringStatusVariant(
  status: RecurringInvoiceStatus,
): "secondary" | "destructive" | "outline" | "success" | "warning" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "PAUSED":
      return "warning";
    case "ENDED":
      return "secondary";
    default:
      return "outline";
  }
}
