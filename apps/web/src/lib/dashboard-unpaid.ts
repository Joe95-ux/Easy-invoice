import { daysUntilDue, formatUtcDateLabel, startOfUtcDay } from "@/lib/reminders/dates";

export type UnpaidAttentionInvoice = {
  id: string;
  number: string;
  currency: string;
  clientName: string | null;
  balanceDue: number;
  dueDate: Date | null;
};

export type UnpaidAttentionPreview = {
  id: string;
  number: string;
  clientName: string | null;
  href: string;
  amount: number;
  currency: string;
  dueLabel: string;
  isOverdue: boolean;
};

export type DashboardUnpaidAttention = {
  count: number;
  overdueCount: number;
  dueTodayCount: number;
  previews: UnpaidAttentionPreview[];
};

/** Open invoices that are overdue or due today, most overdue first. */
export function buildUnpaidAttention(
  invoices: UnpaidAttentionInvoice[],
  today = new Date(),
  take = 5,
): DashboardUnpaidAttention {
  const day = startOfUtcDay(today);
  const rows: Array<UnpaidAttentionPreview & { until: number }> = [];

  for (const invoice of invoices) {
    if (invoice.balanceDue <= 0.001 || !invoice.dueDate) continue;
    const until = daysUntilDue(day, invoice.dueDate);
    if (until > 0) continue;
    rows.push({
      id: invoice.id,
      number: invoice.number,
      clientName: invoice.clientName,
      href: `/invoices/${invoice.id}`,
      amount: invoice.balanceDue,
      currency: invoice.currency,
      dueLabel: formatUtcDateLabel(invoice.dueDate),
      isOverdue: until < 0,
      until,
    });
  }

  rows.sort((a, b) => a.until - b.until || a.number.localeCompare(b.number));

  const overdueCount = rows.filter((row) => row.isOverdue).length;
  const dueTodayCount = rows.length - overdueCount;

  return {
    count: rows.length,
    overdueCount,
    dueTodayCount,
    previews: rows.slice(0, take).map(({ until: _until, ...preview }) => preview),
  };
}