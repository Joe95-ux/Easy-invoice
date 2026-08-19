export type PlanId = "FREE" | "PRO";
export type BillingInterval = "monthly" | "yearly";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  summary: string;
  features: string[];
};

/** List price — yearly is $120/yr (= $10/mo). */
export const PRO_PRICING = {
  monthly: {
    perMonthLabel: "$12",
    periodHint: "per month",
    detail: "$12 / month",
    headerDescription: "$12 per month · cancel anytime",
  },
  yearly: {
    perMonthLabel: "$10",
    periodHint: "per month",
    detail: "$120 / year · $10 / month",
    yearlyTotalLabel: "$120",
    headerDescription: "$10 per month · billed yearly as $120 · cancel anytime",
  },
} as const;

export function getProPriceDisplay(interval: BillingInterval) {
  return interval === "yearly" ? PRO_PRICING.yearly : PRO_PRICING.monthly;
}

/** Plans shown in billing UI (Free + Pro only for now). */
export const BILLING_PLANS: PlanDefinition[] = [
  {
    id: "FREE",
    name: "Free",
    summary: "Free for getting started",
    features: [
      "20 invoices per month",
      "2 companies",
      "2 team members",
      "5 QR codes",
      "Time tracking",
      "AI describe-to-invoice",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    summary: "For businesses that bill every day",
    features: [
      "Unlimited invoices & estimates",
      "Unlimited companies",
      "Unlimited team members",
      "Unlimited QR codes",
      "Time tracking & billing",
      "Custom branding & logo",
      "Email invoices & payment tracking",
      "Priority support",
    ],
  },
];

/** Upgrade card: Pro highlights in three short columns. */
export const PRO_UPGRADE_COLUMNS: { title: string; features: string[] }[] = [
  {
    title: "Workspace",
    features: ["Unlimited companies", "Unlimited team members", "Priority support"],
  },
  {
    title: "Invoicing",
    features: ["Unlimited invoices", "Estimates & recurring", "Time tracking", "AI draft"],
  },
  {
    title: "Grow",
    features: ["Unlimited QR codes", "Custom branding", "Email & payment tracking"],
  },
];

export type ComparisonSection = {
  title: string;
  rows: { label: string; free: string | boolean; pro: string | boolean }[];
};

/** Linear-style categorized comparison for /settings/billing/plans */
export const PLAN_COMPARISON_SECTIONS: ComparisonSection[] = [
  {
    title: "Usage",
    rows: [
      { label: "Invoices per month", free: "20", pro: "Unlimited" },
      { label: "Companies", free: "2", pro: "Unlimited" },
      { label: "Team members", free: "2", pro: "Unlimited" },
      { label: "QR codes", free: "5", pro: "Unlimited" },
      { label: "Estimates", free: true, pro: true },
      { label: "Clients", free: true, pro: true },
    ],
  },
  {
    title: "Core features",
    rows: [
      { label: "Time tracking", free: true, pro: true },
      { label: "AI describe-to-invoice", free: true, pro: true },
      { label: "PDF templates", free: true, pro: true },
      { label: "Custom branding & logo", free: false, pro: true },
      { label: "Email invoices", free: false, pro: true },
      { label: "Payment tracking", free: false, pro: true },
      { label: "Recurring invoices", free: false, pro: true },
      { label: "Priority support", free: false, pro: true },
    ],
  },
];

export function normalizePlanId(plan: string | null | undefined): PlanId {
  const value = (plan ?? "FREE").toUpperCase();
  return value === "PRO" || value === "BUSINESS" || value === "SCALE" ? "PRO" : "FREE";
}

export function getPlanDefinition(planId: PlanId): PlanDefinition {
  return BILLING_PLANS.find((p) => p.id === planId) ?? BILLING_PLANS[0]!;
}

export function formatPlanPriceLabel(
  planId: PlanId,
  interval: BillingInterval = "monthly",
): { amount: string; hint: string; detail?: string } {
  if (planId === "FREE") {
    return { amount: "$0", hint: "per month" };
  }
  const pricing = getProPriceDisplay(interval);
  return {
    amount: pricing.perMonthLabel,
    hint: pricing.periodHint,
    detail: pricing.detail,
  };
}
