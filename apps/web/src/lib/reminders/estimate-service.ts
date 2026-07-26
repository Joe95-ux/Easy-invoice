import {
  EstimateStatus,
  ReminderDeliveryStatus,
  ReminderKind,
} from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";
import { publicDocumentUrl } from "@/lib/document-tokens";
import { formatDueDateLabel } from "@/lib/reminder-email";
import { sendEstimateReminderEmail } from "@/lib/estimate-reminder-email";
import { generateEstimatePdfBuffer } from "@/lib/estimate-service";
import { formatMoney } from "@/lib/estimates";
import { buildReminderRevisionSummary } from "@/lib/document-revisions/snapshot";
import { recordDocumentRevision } from "@/lib/document-revisions/service";
import { createNotification } from "@/lib/notifications/service";
import { ensureEstimatePublicToken } from "@/lib/public-documents";
import { daysUntilDue, startOfUtcDay } from "@/lib/reminders/dates";
import {
  estimateReminderSettingsFromCompany,
  type EstimateReminderSettings,
} from "@/lib/reminders/estimate-settings";
import type { ReminderSlot } from "@/lib/reminders/service";
import { prisma } from "@/lib/db";

const REMINDABLE_STATUSES: EstimateStatus[] = ["SENT", "VIEWED"];

export async function isEstimatePastValidUntil(
  validUntil: Date | null | undefined,
  now = new Date(),
): boolean {
  if (!validUntil) return false;
  return startOfUtcDay(validUntil) < startOfUtcDay(now);
}

async function notifyEstimateExpired(estimate: {
  id: string;
  number: string;
  companyId: string;
}) {
  const memberIds = (
    await prisma.companyMember.findMany({
      where: { companyId: estimate.companyId },
      select: { id: true },
    })
  ).map((m) => m.id);

  await createNotification({
    companyId: estimate.companyId,
    recipientMemberIds: memberIds,
    type: "ESTIMATE_EXPIRED",
    title: "Estimate expired",
    body: `Estimate ${estimate.number} expired without a response`,
    linkUrl: `/estimates/${estimate.id}`,
  }).catch(() => undefined);

  await recordDocumentRevision({
    companyId: estimate.companyId,
    documentType: "ESTIMATE",
    documentId: estimate.id,
    source: "STATUS",
    summary: "Estimate expired (valid-until date passed)",
    metadata: { actorName: "System" },
  }).catch(() => undefined);
}

/** Mark a SENT/VIEWED estimate expired and notify the company (idempotent if already expired). */
export async function expireEstimateIfPastValidUntil(
  estimateId: string,
  now = new Date(),
): Promise<boolean> {
  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId },
    select: {
      id: true,
      number: true,
      companyId: true,
      status: true,
      validUntil: true,
    },
  });

  if (!estimate) return false;
  if (estimate.status !== "SENT" && estimate.status !== "VIEWED") return false;
  if (!isEstimatePastValidUntil(estimate.validUntil, now)) return false;

  await prisma.estimate.update({
    where: { id: estimate.id },
    data: { status: "EXPIRED" },
  });
  await notifyEstimateExpired(estimate);
  return true;
}

export function slotsForEstimateToday(
  settings: EstimateReminderSettings,
  validUntil: Date,
  today: Date,
): ReminderSlot[] {
  if (!settings.estimateRemindersEnabled) return [];

  const diff = daysUntilDue(today, validUntil);
  const slots: ReminderSlot[] = [];

  if (diff > 0 && settings.estimateReminderDaysBefore.includes(diff)) {
    slots.push({ kind: ReminderKind.BEFORE_DUE, offsetDays: diff });
  }
  if (diff === 0 && settings.estimateReminderOnExpiryDay) {
    slots.push({ kind: ReminderKind.ON_DUE, offsetDays: 0 });
  }

  return slots;
}

export async function markExpiredEstimates(now = new Date()) {
  const today = startOfUtcDay(now);

  const candidates = await prisma.estimate.findMany({
    where: {
      status: { in: ["SENT", "VIEWED"] },
      validUntil: { not: null, lt: today },
    },
    select: {
      id: true,
      number: true,
      companyId: true,
    },
  });

  let count = 0;
  for (const estimate of candidates) {
    await prisma.estimate.update({
      where: { id: estimate.id },
      data: { status: "EXPIRED" },
    });
    await notifyEstimateExpired(estimate);
    count += 1;
  }

  return count;
}

type SendReminderResult =
  | { ok: true; reminderId: string }
  | { ok: false; error: string; skipped?: boolean };

export async function sendEstimateReminder(options: {
  estimateId: string;
  companyId: string;
  kind: ReminderKind;
  offsetDays: number;
  scheduleDate: Date;
  recipientEmail?: string;
  memberId?: string | null;
}): Promise<SendReminderResult> {
  const scheduleDate = startOfUtcDay(options.scheduleDate);

  const existing = await prisma.estimateReminder.findUnique({
    where: {
      estimateId_kind_offsetDays_scheduleDate: {
        estimateId: options.estimateId,
        kind: options.kind,
        offsetDays: options.offsetDays,
        scheduleDate,
      },
    },
  });

  if (existing) {
    return { ok: false, error: "Follow-up already sent for this schedule", skipped: true };
  }

  const pdfResult = await generateEstimatePdfBuffer(options.estimateId, options.companyId);
  if (!pdfResult) {
    return { ok: false, error: "Estimate not found" };
  }

  const { estimate, pdfBuffer } = pdfResult;
  const settings = estimateReminderSettingsFromCompany(estimate.company);

  if (estimate.remindersPaused && options.kind !== ReminderKind.MANUAL) {
    return { ok: false, error: "Follow-ups paused for this estimate", skipped: true };
  }

  if (!REMINDABLE_STATUSES.includes(estimate.status)) {
    return { ok: false, error: "Estimate is not eligible for follow-ups", skipped: true };
  }

  if (!estimate.validUntil) {
    return { ok: false, error: "Estimate has no valid-until date", skipped: true };
  }

  if (!estimate.sentAt) {
    return { ok: false, error: "Estimate has not been sent yet", skipped: true };
  }

  if (isEstimatePastValidUntil(estimate.validUntil, scheduleDate)) {
    return { ok: false, error: "Estimate has already expired", skipped: true };
  }

  const toEmail = options.recipientEmail ?? estimate.client?.email;
  if (!toEmail) {
    return { ok: false, error: "Client email is required" };
  }

  const origin = await getAppOrigin();
  const token = await ensureEstimatePublicToken(options.estimateId, options.companyId);
  const viewUrl = token
    ? publicDocumentUrl(origin, "estimate", token)
    : `${origin}/estimates/${options.estimateId}`;

  try {
    await sendEstimateReminderEmail({
      to: toEmail,
      companyName: estimate.company.name,
      estimateNumber: estimate.number,
      total: formatMoney(estimate.total, estimate.currency),
      validUntilLabel: formatDueDateLabel(estimate.validUntil),
      viewUrl,
      kind: options.kind,
      pdfBuffer: settings.estimateReminderIncludePdf ? pdfBuffer : undefined,
    });

    const reminder = await prisma.estimateReminder.create({
      data: {
        estimateId: options.estimateId,
        kind: options.kind,
        offsetDays: options.offsetDays,
        scheduleDate,
        toEmail,
        status: ReminderDeliveryStatus.SENT,
      },
    });

    await recordDocumentRevision({
      companyId: options.companyId,
      documentType: "ESTIMATE",
      documentId: options.estimateId,
      memberId: options.memberId ?? null,
      source: "REMINDER",
      summary: buildReminderRevisionSummary(options.kind, toEmail),
      metadata: {
        email: toEmail,
        kind: options.kind,
        reminderId: reminder.id,
        ...(options.memberId ? {} : { actorName: "System" }),
      },
    });

    return { ok: true, reminderId: reminder.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send follow-up";

    await prisma.estimateReminder
      .create({
        data: {
          estimateId: options.estimateId,
          kind: options.kind,
          offsetDays: options.offsetDays,
          scheduleDate,
          toEmail,
          status: ReminderDeliveryStatus.FAILED,
          error: message,
        },
      })
      .catch(() => undefined);

    return { ok: false, error: message };
  }
}

export async function runEstimateReminderJob(now = new Date()) {
  const today = startOfUtcDay(now);
  const expiredUpdated = await markExpiredEstimates(now);

  const companies = await prisma.company.findMany({
    where: { estimateRemindersEnabled: true },
    select: {
      id: true,
      estimateRemindersEnabled: true,
      estimateReminderDaysBefore: true,
      estimateReminderOnExpiryDay: true,
      estimateReminderIncludePdf: true,
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const company of companies) {
    const settings = estimateReminderSettingsFromCompany(company);

    const estimates = await prisma.estimate.findMany({
      where: {
        companyId: company.id,
        remindersPaused: false,
        sentAt: { not: null },
        validUntil: { not: null },
        status: { in: REMINDABLE_STATUSES },
        client: { email: { not: null } },
      },
      select: {
        id: true,
        validUntil: true,
      },
    });

    for (const estimate of estimates) {
      if (!estimate.validUntil) continue;
      const slots = slotsForEstimateToday(settings, estimate.validUntil, today);
      for (const slot of slots) {
        const result = await sendEstimateReminder({
          estimateId: estimate.id,
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

  return { expiredUpdated, sent, skipped, failed, ranAt: now.toISOString() };
}

export async function getEstimateReminders(estimateId: string, companyId: string) {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    select: { id: true },
  });
  if (!estimate) return null;

  return prisma.estimateReminder.findMany({
    where: { estimateId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
