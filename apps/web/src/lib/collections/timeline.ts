import { addUtcDays, daysUntilDue, startOfUtcDay } from "@/lib/reminders/dates";
import type { CollectionsSettings, LateFeeSettings } from "@/lib/collections/settings";

export type CollectionsEmailTone = "notice" | "firm" | "final";

export type CollectionsTimelineKind = "collections" | "late_fee";

export type CollectionsTimelineStatus =
  | "upcoming"
  | "due_today"
  | "sent"
  | "applied"
  | "missed"
  | "failed"
  | "skipped";

export type CollectionsTimelineStep = {
  id: string;
  kind: CollectionsTimelineKind;
  offsetDays: number;
  date: string;
  title: string;
  detail: string;
  status: CollectionsTimelineStatus;
  tone?: CollectionsEmailTone;
  attachesPdf?: boolean;
  attachesStatement?: boolean;
};

export type CollectionsReminderEvent = {
  kind: string;
  offsetDays: number;
  status: string;
};

export function collectionsToneForStep(index: number, total: number): CollectionsEmailTone {
  if (total <= 1 || index >= total - 1) return "final";
  if (index === 0) return "notice";
  return "firm";
}

export function collectionsToneForOffset(
  offsetDays: number,
  schedule: number[],
): CollectionsEmailTone {
  const sorted = normalizeSchedule(schedule);
  if (sorted.length === 0) return "firm";
  const index = sorted.indexOf(offsetDays);
  if (index >= 0) return collectionsToneForStep(index, sorted.length);
  if (offsetDays >= sorted[sorted.length - 1]!) return "final";
  return offsetDays <= sorted[0]! ? "notice" : "firm";
}

export function collectionsToneLabel(tone: CollectionsEmailTone): string {
  if (tone === "notice") return "Overdue notice";
  if (tone === "final") return "Final notice";
  return "Firm chase";
}

function normalizeSchedule(days: number[]): number[] {
  return [...new Set(days.filter((day) => Number.isFinite(day) && day > 0))].sort(
    (a, b) => a - b,
  );
}

function toIsoDate(date: Date): string {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function matchCollectionsReminder(
  reminders: CollectionsReminderEvent[],
  offsetDays: number,
): CollectionsReminderEvent | undefined {
  return reminders.find(
    (reminder) => reminder.kind === "COLLECTIONS" && reminder.offsetDays === offsetDays,
  );
}

function statusForScheduledDay(input: {
  scheduled: Date;
  today: Date;
  reminder?: CollectionsReminderEvent;
  settled: boolean;
  paused: boolean;
}): CollectionsTimelineStatus {
  if (input.reminder?.status === "SENT") return "sent";
  if (input.reminder?.status === "FAILED") return "failed";
  if (input.settled || input.paused) return "skipped";
  const diff = daysUntilDue(input.today, input.scheduled);
  if (diff > 0) return "upcoming";
  if (diff === 0) return "due_today";
  return "missed";
}

export function buildCollectionsTimeline(input: {
  dueDate: Date | null;
  today?: Date;
  settled?: boolean;
  paused?: boolean;
  collections: CollectionsSettings;
  lateFees: LateFeeSettings;
  reminders?: CollectionsReminderEvent[];
  lateFeeAppliedAt?: Date | null;
  lateFeeAmountLabel?: string | null;
}): CollectionsTimelineStep[] {
  const due = input.dueDate ? startOfUtcDay(input.dueDate) : null;
  if (!due) return [];

  const today = startOfUtcDay(input.today ?? new Date());
  const settled = Boolean(input.settled);
  const paused = Boolean(input.paused);
  const reminders = input.reminders ?? [];
  const steps: CollectionsTimelineStep[] = [];

  if (input.collections.collectionsEnabled) {
    const schedule = normalizeSchedule(input.collections.collectionsDaysAfter);
    schedule.forEach((offsetDays, index) => {
      const scheduled = addUtcDays(due, offsetDays);
      const tone = collectionsToneForStep(index, schedule.length);
      const reminder = matchCollectionsReminder(reminders, offsetDays);
      const extras = [
        input.collections.collectionsIncludePdf ? "invoice PDF" : null,
        input.collections.collectionsAttachStatement ? "account statement" : null,
      ].filter(Boolean);

      steps.push({
        id: `collections-${offsetDays}`,
        kind: "collections",
        offsetDays,
        date: toIsoDate(scheduled),
        title: `${collectionsToneLabel(tone)} · day ${offsetDays}`,
        detail:
          extras.length > 0
            ? `Email the client and attach the ${extras.join(" and ")}.`
            : "Email the client a collections notice.",
        status: statusForScheduledDay({
          scheduled,
          today,
          reminder,
          settled,
          paused,
        }),
        tone,
        attachesPdf: input.collections.collectionsIncludePdf,
        attachesStatement: input.collections.collectionsAttachStatement,
      });
    });
  }

  if (input.lateFees.lateFeesEnabled) {
    const offsetDays = input.lateFees.lateFeeGraceDays + 1;
    const scheduled = addUtcDays(due, offsetDays);
    const applied = Boolean(input.lateFeeAppliedAt);
    const amountLabel = input.lateFeeAmountLabel ? ` · ${input.lateFeeAmountLabel}` : "";
    let status: CollectionsTimelineStatus;
    if (applied) status = "applied";
    else if (settled || paused) status = "skipped";
    else {
      const diff = daysUntilDue(today, scheduled);
      if (diff > 0) status = "upcoming";
      else if (diff === 0) status = "due_today";
      else status = "missed";
    }

    steps.push({
      id: `late-fee-${offsetDays}`,
      kind: "late_fee",
      offsetDays,
      date: toIsoDate(input.lateFeeAppliedAt ?? scheduled),
      title: applied
        ? `Late fee applied${amountLabel}`
        : `Late fee · day ${offsetDays}`,
      detail:
        input.lateFees.lateFeeGraceDays > 0
          ? `Adds after ${input.lateFees.lateFeeGraceDays} grace day(s) past due.`
          : "Adds the day after the invoice is past due.",
      status,
    });
  }

  return steps.sort((a, b) => a.offsetDays - b.offsetDays || a.id.localeCompare(b.id));
}
