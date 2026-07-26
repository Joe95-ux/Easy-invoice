import type { Company } from "@/lib/db";
import type { ReminderSettings } from "@/lib/reminders/settings";
import { reminderSettingsFromCompany } from "@/lib/reminders/settings";

export type { ReminderSettings };

export type EstimateReminderSettings = {
  estimateRemindersEnabled: boolean;
  estimateReminderDaysBefore: number[];
  estimateReminderOnExpiryDay: boolean;
  estimateReminderIncludePdf: boolean;
};

export type CombinedReminderSettings = ReminderSettings & EstimateReminderSettings;

export function estimateReminderSettingsFromCompany(
  company: Pick<
    Company,
    | "estimateRemindersEnabled"
    | "estimateReminderDaysBefore"
    | "estimateReminderOnExpiryDay"
    | "estimateReminderIncludePdf"
  >,
): EstimateReminderSettings {
  return {
    estimateRemindersEnabled: company.estimateRemindersEnabled,
    estimateReminderDaysBefore: company.estimateReminderDaysBefore,
    estimateReminderOnExpiryDay: company.estimateReminderOnExpiryDay,
    estimateReminderIncludePdf: company.estimateReminderIncludePdf,
  };
}

export function combinedReminderSettingsFromCompany(
  company: Parameters<typeof reminderSettingsFromCompany>[0] &
    Parameters<typeof estimateReminderSettingsFromCompany>[0],
): CombinedReminderSettings {
  return {
    ...reminderSettingsFromCompany(company),
    ...estimateReminderSettingsFromCompany(company),
  };
}

export function describeEstimateReminderSchedule(settings: EstimateReminderSettings): string[] {
  if (!settings.estimateRemindersEnabled) {
    return ["Automatic estimate follow-ups are turned off."];
  }

  const lines: string[] = [];
  if (settings.estimateReminderDaysBefore.length > 0) {
    lines.push(
      `${settings.estimateReminderDaysBefore.join(", ")} day(s) before valid-until date`,
    );
  }
  if (settings.estimateReminderOnExpiryDay) {
    lines.push("On the valid-until date");
  }

  if (lines.length === 0) {
    return ["No estimate follow-up schedule configured."];
  }

  return lines;
}
