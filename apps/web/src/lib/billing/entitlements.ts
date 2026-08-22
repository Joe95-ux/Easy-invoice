import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePlanId, type PlanId } from "@/features/settings/lib/plans-catalog";
import { isPaidPlan } from "@/lib/stripe-billing";

/** Free-tier caps — keep in sync with plans-catalog. */
export const FREE_LIMITS = {
  invoicesPerMonth: 20,
  companiesPerUser: 2,
  membersPerCompany: 2,
  qrCodes: 5,
} as const;

export type PlanFeature =
  | "custom_branding"
  | "email_invoices"
  | "manual_payment_tracking"
  | "recurring_invoices"
  | "payment_plans"
  | "collections";

const PRO_FEATURE_LABEL: Record<PlanFeature, string> = {
  custom_branding: "Custom branding is available on Pro",
  email_invoices: "Emailing invoices is available on Pro",
  manual_payment_tracking: "Manual payment tracking is available on Pro",
  recurring_invoices: "Recurring invoices are available on Pro",
  payment_plans: "Payment plans are available on Pro",
  collections: "Collections tools are available on Pro",
};

export class PlanLimitError extends Error {
  readonly code: "PLAN_LIMIT" | "PRO_REQUIRED";
  readonly status = 403 as const;

  constructor(message: string, code: "PLAN_LIMIT" | "PRO_REQUIRED" = "PLAN_LIMIT") {
    super(message);
    this.name = "PlanLimitError";
    this.code = code;
  }
}

export function planLimitResponse(error: PlanLimitError) {
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: error.status },
  );
}

export function isPlanLimitError(error: unknown): error is PlanLimitError {
  return error instanceof PlanLimitError;
}

export function toPlanId(plan: string | null | undefined): PlanId {
  return normalizePlanId(plan);
}

export function isProPlan(plan: string | null | undefined): boolean {
  return isPaidPlan(plan);
}

/** UTC calendar-month window for invoice quota. */
export function currentInvoiceMonthRange(now = new Date()) {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
  return { start, end };
}

export async function countInvoicesThisMonth(companyId: string): Promise<number> {
  const { start, end } = currentInvoiceMonthRange();
  return prisma.invoice.count({
    where: {
      companyId,
      createdAt: { gte: start, lt: end },
    },
  });
}

export async function countQrCodes(companyId: string): Promise<number> {
  return prisma.qrCode.count({
    where: {
      companyId,
      status: { not: "DELETED" },
    },
  });
}

export async function countCompanyMembers(companyId: string): Promise<number> {
  return prisma.companyMember.count({ where: { companyId } });
}

export async function countPendingInvites(companyId: string): Promise<number> {
  return prisma.companyInvite.count({
    where: {
      companyId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

export async function countUserCompanies(clerkId: string): Promise<number> {
  return prisma.companyMember.count({ where: { clerkId } });
}

export type CompanyUsage = {
  plan: PlanId;
  isPro: boolean;
  invoicesThisMonth: number;
  invoicesLimit: number | null;
  qrCodes: number;
  qrCodesLimit: number | null;
  members: number;
  membersLimit: number | null;
  pendingInvites: number;
};

export async function getCompanyUsage(
  companyId: string,
  plan: string | null | undefined,
): Promise<CompanyUsage> {
  const planId = toPlanId(plan);
  const pro = isProPlan(planId);
  const [invoicesThisMonth, qrCodes, members, pendingInvites] = await Promise.all([
    countInvoicesThisMonth(companyId),
    countQrCodes(companyId),
    countCompanyMembers(companyId),
    countPendingInvites(companyId),
  ]);

  return {
    plan: planId,
    isPro: pro,
    invoicesThisMonth,
    invoicesLimit: pro ? null : FREE_LIMITS.invoicesPerMonth,
    qrCodes,
    qrCodesLimit: pro ? null : FREE_LIMITS.qrCodes,
    members,
    membersLimit: pro ? null : FREE_LIMITS.membersPerCompany,
    pendingInvites,
  };
}

export async function assertWithinInvoiceQuota(
  companyId: string,
  plan: string | null | undefined,
): Promise<void> {
  if (isProPlan(plan)) return;
  const used = await countInvoicesThisMonth(companyId);
  if (used >= FREE_LIMITS.invoicesPerMonth) {
    throw new PlanLimitError(
      `Free plan allows ${FREE_LIMITS.invoicesPerMonth} invoices per month. Upgrade to Pro for unlimited invoicing.`,
    );
  }
}

export async function assertCanCreateQrCode(
  companyId: string,
  plan: string | null | undefined,
): Promise<void> {
  if (isProPlan(plan)) return;
  const used = await countQrCodes(companyId);
  if (used >= FREE_LIMITS.qrCodes) {
    throw new PlanLimitError(
      `Free plan allows ${FREE_LIMITS.qrCodes} QR codes. Upgrade to Pro for unlimited codes.`,
    );
  }
}

export async function assertCanInviteMember(
  companyId: string,
  plan: string | null | undefined,
): Promise<void> {
  if (isProPlan(plan)) return;
  const [members, pending] = await Promise.all([
    countCompanyMembers(companyId),
    countPendingInvites(companyId),
  ]);
  if (members + pending >= FREE_LIMITS.membersPerCompany) {
    throw new PlanLimitError(
      `Free plan allows ${FREE_LIMITS.membersPerCompany} team members. Upgrade to Pro for unlimited seats.`,
    );
  }
}

/**
 * Free users may belong to at most 2 companies.
 * Users with any Pro company may create additional workspaces.
 */
export async function assertCanCreateCompany(clerkId: string): Promise<void> {
  const memberships = await prisma.companyMember.findMany({
    where: { clerkId },
    select: { company: { select: { plan: true } } },
  });
  if (memberships.length < FREE_LIMITS.companiesPerUser) return;
  const hasPro = memberships.some((m) => isProPlan(m.company.plan));
  if (!hasPro) {
    throw new PlanLimitError(
      `Free plan allows ${FREE_LIMITS.companiesPerUser} companies. Upgrade a workspace to Pro to add more.`,
    );
  }
}

export function assertProFeature(
  plan: string | null | undefined,
  feature: PlanFeature,
): void {
  if (isProPlan(plan)) return;
  throw new PlanLimitError(PRO_FEATURE_LABEL[feature], "PRO_REQUIRED");
}
