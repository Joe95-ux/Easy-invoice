import {
  InvoiceStatus,
  ReminderDeliveryStatus,
  ReminderKind,
} from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";
import { publicDocumentUrl } from "@/lib/document-tokens";
import { formatDueDateLabel, sendPaymentReminderEmail } from "@/lib/reminder-email";
import { generateInvoicePdfBuffer } from "@/lib/invoice-service";
import { formatMoney } from "@/lib/invoices";
import { ensureInvoicePublicToken } from "@/lib/public-documents";
import { daysUntilDue, startOfUtcDay } from "@/lib/reminders/dates";
import type { ReminderSettings } from "@/lib/reminders/settings";
import { reminderSettingsFromCompany } from "@/lib/reminders/settings";
import { prisma } from "@/lib/db";

const REMINDABLE_STATUSES: InvoiceStatus[] = ["SENT", "VIEWED", "OVERDUE"];

export type ReminderSlot = {
  kind: ReminderKind;
  offsetDays: number;
};

export function slotsForInvoiceToday(
  settings: ReminderSettings,
  dueDate: Date,
  today: Date,
): ReminderSlot[] {
  if (!settings.remindersEnabled) return [];

  const diff = daysUntilDue(today, dueDate);
  const slots: ReminderSlot[] = [];

  if (diff > 0 && settings.reminderDaysBefore.includes(diff)) {
    slots.push({ kind: ReminderKind.BEFORE_DUE, offsetDays: diff });
  }
  if (diff === 0 && settings.reminderOnDueDate) {
    slots.push({ kind: ReminderKind.ON_DUE, offsetDays: 0 });
  }
  if (diff < 0 && settings.reminderDaysAfter.includes(-diff)) {
    slots.push({ kind: ReminderKind.OVERDUE, offsetDays: -diff });
  }

  return slots;
}

export async function markOverdueInvoices(now = new Date()) {
  const today = startOfUtcDay(now);

  const result = await prisma.invoice.updateMany({
    where: {
      status: { in: ["SENT", "VIEWED"] },
      dueDate: { lt: today },
    },
    data: { status: "OVERDUE" },
  });

  return result.count;
}

type SendReminderResult =
  | { ok: true; reminderId: string }
  | { ok: false; error: string; skipped?: boolean };

export async function sendInvoiceReminder(options: {
  invoiceId: string;
  companyId: string;
  kind: ReminderKind;
  offsetDays: number;
  scheduleDate: Date;
  recipientEmail?: string;
}): Promise<SendReminderResult> {
  const scheduleDate = startOfUtcDay(options.scheduleDate);

  const existing = await prisma.invoiceReminder.findUnique({
    where: {
      invoiceId_kind_offsetDays_scheduleDate: {
        invoiceId: options.invoiceId,
        kind: options.kind,
        offsetDays: options.offsetDays,
        scheduleDate,
      },
    },
  });

  if (existing) {
    return { ok: false, error: "Reminder already sent for this schedule", skipped: true };
  }

  const pdfResult = await generateInvoicePdfBuffer(options.invoiceId, options.companyId);
  if (!pdfResult) {
    return { ok: false, error: "Invoice not found" };
  }

  const { invoice, pdfBuffer } = pdfResult;
  const settings = reminderSettingsFromCompany(invoice.company);

  if (invoice.remindersPaused && options.kind !== ReminderKind.MANUAL) {
    return { ok: false, error: "Reminders paused for this invoice", skipped: true };
  }

  if (!REMINDABLE_STATUSES.includes(invoice.status)) {
    return { ok: false, error: "Invoice is not eligible for reminders", skipped: true };
  }

  if (!invoice.dueDate) {
    return { ok: false, error: "Invoice has no due date", skipped: true };
  }

  if (!invoice.sentAt) {
    return { ok: false, error: "Invoice has not been sent yet", skipped: true };
  }

  const toEmail = options.recipientEmail ?? invoice.client?.email;
  if (!toEmail) {
    return { ok: false, error: "Client email is required" };
  }

  const origin = await getAppOrigin();
  const token = await ensureInvoicePublicToken(options.invoiceId, options.companyId);
  const viewUrl = token
    ? publicDocumentUrl(origin, "invoice", token)
    : `${origin}/invoices/${options.invoiceId}`;

  try {
    await sendPaymentReminderEmail({
      to: toEmail,
      companyName: invoice.company.name,
      invoiceNumber: invoice.number,
      total: formatMoney(invoice.total, invoice.currency),
      dueDateLabel: formatDueDateLabel(invoice.dueDate),
      viewUrl,
      kind: options.kind,
      pdfBuffer: settings.reminderIncludePdf ? pdfBuffer : undefined,
    });

    const reminder = await prisma.invoiceReminder.create({
      data: {
        invoiceId: options.invoiceId,
        kind: options.kind,
        offsetDays: options.offsetDays,
        scheduleDate,
        toEmail,
        status: ReminderDeliveryStatus.SENT,
      },
    });

    return { ok: true, reminderId: reminder.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send reminder";

    await prisma.invoiceReminder.create({
      data: {
        invoiceId: options.invoiceId,
        kind: options.kind,
        offsetDays: options.offsetDays,
        scheduleDate,
        toEmail,
        status: ReminderDeliveryStatus.FAILED,
        error: message,
      },
    }).catch(() => undefined);

    return { ok: false, error: message };
  }
}

export async function runInvoiceReminderJob(now = new Date()) {
  const today = startOfUtcDay(now);
  const overdueUpdated = await markOverdueInvoices(now);

  const companies = await prisma.company.findMany({
    where: { remindersEnabled: true },
    select: {
      id: true,
      remindersEnabled: true,
      reminderDaysBefore: true,
      reminderOnDueDate: true,
      reminderDaysAfter: true,
      reminderIncludePdf: true,
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const company of companies) {
    const settings = reminderSettingsFromCompany(company);

    const invoices = await prisma.invoice.findMany({
      where: {
        companyId: company.id,
        remindersPaused: false,
        dueDate: { not: null },
        sentAt: { not: null },
        status: { in: REMINDABLE_STATUSES },
        client: { email: { not: null } },
      },
      select: { id: true, dueDate: true },
    });

    for (const invoice of invoices) {
      if (!invoice.dueDate) continue;

      const slots = slotsForInvoiceToday(settings, invoice.dueDate, today);
      for (const slot of slots) {
        const result = await sendInvoiceReminder({
          invoiceId: invoice.id,
          companyId: company.id,
          kind: slot.kind,
          offsetDays: slot.offsetDays,
          scheduleDate: today,
        });

        if (result.ok) sent += 1;
        else if (result.skipped) skipped += 1;
        else failed += 1;
      }
    }
  }

  return { overdueUpdated, sent, skipped, failed, ranAt: now.toISOString() };
}

export async function getInvoiceReminders(invoiceId: string, companyId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    select: { id: true },
  });
  if (!invoice) return null;

  return prisma.invoiceReminder.findMany({
    where: { invoiceId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
