import type { Company } from "@/lib/db";

export type ReminderSettings = {
  remindersEnabled: boolean;
  reminderDaysBefore: number[];
  reminderOnDueDate: boolean;
  reminderDaysAfter: number[];
  reminderIncludePdf: boolean;
};

export function reminderSettingsFromCompany(company: Pick<
  Company,
  | "remindersEnabled"
  | "reminderDaysBefore"
  | "reminderOnDueDate"
  | "reminderDaysAfter"
  | "reminderIncludePdf"
>): ReminderSettings {
  return {
    remindersEnabled: company.remindersEnabled,
    reminderDaysBefore: company.reminderDaysBefore,
    reminderOnDueDate: company.reminderOnDueDate,
    reminderDaysAfter: company.reminderDaysAfter,
    reminderIncludePdf: company.reminderIncludePdf,
  };
}

export function describeReminderSchedule(settings: ReminderSettings): string[] {
  const lines: string[] = [];

  if (!settings.remindersEnabled) {
    return ["Automatic reminders are turned off."];
  }

  if (settings.reminderDaysBefore.length > 0) {
    lines.push(
      `${settings.reminderDaysBefore.join(", ")} day(s) before due date`,
    );
  }
  if (settings.reminderOnDueDate) {
    lines.push("On the due date");
  }
  if (settings.reminderDaysAfter.length > 0) {
    lines.push(
      `${settings.reminderDaysAfter.join(", ")} day(s) after due date (overdue)`,
    );
  }

  if (lines.length === 0) {
    return ["No reminder schedule configured."];
  }

  return lines;
}
