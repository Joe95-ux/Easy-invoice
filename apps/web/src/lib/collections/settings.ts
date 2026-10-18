import type { Company } from "@/lib/db";

export type CollectionsSettings = {
  collectionsEnabled: boolean;
  collectionsDaysAfter: number[];
  collectionsIncludePdf: boolean;
  collectionsAttachStatement: boolean;
};

export type LateFeeSettings = {
  lateFeesEnabled: boolean;
  lateFeeType: "percent" | "flat";
  lateFeePercent: number;
  lateFeeFlat: number;
  lateFeeGraceDays: number;
};

export function collectionsSettingsFromCompany(
  company: Pick<
    Company,
    | "collectionsEnabled"
    | "collectionsDaysAfter"
    | "collectionsIncludePdf"
    | "collectionsAttachStatement"
  >,
): CollectionsSettings {
  return {
    collectionsEnabled: company.collectionsEnabled,
    collectionsDaysAfter: company.collectionsDaysAfter,
    collectionsIncludePdf: company.collectionsIncludePdf,
    collectionsAttachStatement: company.collectionsAttachStatement,
  };
}

export function lateFeeSettingsFromCompany(
  company: Pick<
    Company,
    "lateFeesEnabled" | "lateFeeType" | "lateFeePercent" | "lateFeeFlat" | "lateFeeGraceDays"
  >,
): LateFeeSettings {
  return {
    lateFeesEnabled: company.lateFeesEnabled,
    lateFeeType: company.lateFeeType === "flat" ? "flat" : "percent",
    lateFeePercent: Number(company.lateFeePercent),
    lateFeeFlat: Number(company.lateFeeFlat),
    lateFeeGraceDays: company.lateFeeGraceDays,
  };
}

export function describeCollectionsSchedule(settings: CollectionsSettings): string[] {
  if (!settings.collectionsEnabled) {
    return ["Automatic collections emails are turned off."];
  }
  if (settings.collectionsDaysAfter.length === 0) {
    return ["No collections schedule configured."];
  }
  return [
    `${settings.collectionsDaysAfter.join(", ")} day(s) after due date (firm chase)`,
  ];
}

export function computeLateFeeAmount(
  remainingInvoice: number,
  settings: Pick<LateFeeSettings, "lateFeeType" | "lateFeePercent" | "lateFeeFlat">,
): number {
  const amount =
    settings.lateFeeType === "flat"
      ? settings.lateFeeFlat
      : (remainingInvoice * settings.lateFeePercent) / 100;
  return Math.round(Math.max(0, amount) * 100) / 100;
}
