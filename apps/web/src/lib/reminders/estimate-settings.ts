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

export type CombinedReminderSettings = ReminderSettings &
  EstimateReminderSettings & {
    collectionsEnabled: boolean;
    collectionsDaysAfter: number[];
    collectionsIncludePdf: boolean;
    collectionsAttachStatement: boolean;
    lateFeesEnabled: boolean;
    lateFeeType: "percent" | "flat";
    lateFeePercent: number;
    lateFeeFlat: number;
    lateFeeGraceDays: number;
  };

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
    Parameters<typeof estimateReminderSettingsFromCompany>[0] & {
      collectionsEnabled: boolean;
      collectionsDaysAfter: number[];
      collectionsIncludePdf: boolean;
      collectionsAttachStatement: boolean;
      lateFeesEnabled: boolean;
      lateFeeType: string;
      lateFeePercent: { toString(): string } | number;
      lateFeeFlat: { toString(): string } | number;
      lateFeeGraceDays: number;
    },
): CombinedReminderSettings {
  return {
    ...reminderSettingsFromCompany(company),
    ...estimateReminderSettingsFromCompany(company),
    collectionsEnabled: company.collectionsEnabled,
    collectionsDaysAfter: company.collectionsDaysAfter,
    collectionsIncludePdf: company.collectionsIncludePdf,
    collectionsAttachStatement: company.collectionsAttachStatement,
    lateFeesEnabled: company.lateFeesEnabled,
    lateFeeType: company.lateFeeType === "flat" ? "flat" : "percent",
    lateFeePercent: Number(company.lateFeePercent),
    lateFeeFlat: Number(company.lateFeeFlat),
    lateFeeGraceDays: company.lateFeeGraceDays,
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
