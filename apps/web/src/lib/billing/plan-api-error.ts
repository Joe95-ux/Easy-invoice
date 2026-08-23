"use client";

import { toast } from "sonner";

export type PlanErrorCode = "PLAN_LIMIT" | "PRO_REQUIRED";

export class PlanApiError extends Error {
  readonly code: PlanErrorCode;

  constructor(message: string, code: PlanErrorCode) {
    super(message);
    this.name = "PlanApiError";
    this.code = code;
  }
}

export function isPlanApiError(error: unknown): error is PlanApiError {
  return error instanceof PlanApiError;
}

export function parsePlanApiError(data: unknown): PlanApiError | null {
  if (!data || typeof data !== "object") return null;
  const record = data as { error?: unknown; code?: unknown };
  const code = record.code;
  if (code !== "PLAN_LIMIT" && code !== "PRO_REQUIRED") return null;
  const message =
    typeof record.error === "string" && record.error.trim()
      ? record.error.trim()
      : code === "PRO_REQUIRED"
        ? "This feature is available on Pro"
        : "You have reached a Free plan limit";
  return new PlanApiError(message, code);
}

/** Throw PlanApiError or generic Error when a fetch response is not ok. */
export function throwIfApiError(
  response: Response,
  data: unknown,
  fallback: string,
): void {
  if (response.ok) return;
  const planError = parsePlanApiError(data);
  if (planError) throw planError;
  const message =
    data &&
    typeof data === "object" &&
    typeof (data as { error?: unknown }).error === "string"
      ? ((data as { error: string }).error || fallback)
      : fallback;
  throw new Error(message);
}

const PLANS_HREF = "/settings/billing/plans";

export function toastPlanError(error: PlanApiError) {
  toast.error(error.message, {
    duration: 9000,
    action: {
      label: error.code === "PRO_REQUIRED" ? "Upgrade to Pro" : "View plans",
      onClick: () => {
        window.location.assign(PLANS_HREF);
      },
    },
  });
}

/** Toast a plan error (with upgrade CTA) or a generic error. */
export function toastApiError(error: unknown, fallback: string) {
  if (isPlanApiError(error)) {
    toastPlanError(error);
    return;
  }
  toast.error(error instanceof Error ? error.message : fallback);
}
