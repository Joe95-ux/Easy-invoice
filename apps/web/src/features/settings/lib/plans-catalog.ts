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
      "2 companies · 2 team members",
      "Estimates with e-sign · clients & products",
      "Public invoice & estimate links",
      "Card payments via Stripe",
      "Record cash, check & bank payments",
      "Reminders, follow-ups & time tracking",
      "5 QR codes · AI describe-to-invoice",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    summary: "Unlimited invoicing that chases payment for you",
    features: [
      "Unlimited invoices, estimates & QR codes",
      "Email invoices with Reply-To your company",
      "Recurring invoices that send on schedule",
      "Payment plans & collections chase tools",
      "Unlimited companies & team members",
      "Custom branding & logo on PDFs",
      "Priority support",
    ],
  },
];

/** Upgrade card: Pro exclusives only (Free features stay on Free). */
export const PRO_UPGRADE_COLUMNS: { title: string; features: string[] }[] = [
  {
    title: "Workspace",
    features: ["Unlimited companies", "Unlimited team members", "Priority support"],
  },
  {
    title: "Invoicing",
    features: [
      "Unlimited invoices",
      "Email invoices",
      "Recurring auto-send",
      "Custom branding & logo",
    ],
  },
  {
    title: "Get paid",
    features: [
      "Payment plans",
      "Collections chase drafts",
      "Unlimited QR codes",
    ],
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
      { label: "Products / services library", free: true, pro: true },
    ],
  },
  {
    title: "Core features",
    rows: [
      { label: "AI describe-to-invoice", free: true, pro: true },
      { label: "PDF templates", free: true, pro: true },
      { label: "Public invoice & estimate links", free: true, pro: true },
      { label: "Estimate e-signature", free: true, pro: true },
      { label: "Viewed tracking", free: true, pro: true },
      { label: "Estimate → invoice", free: true, pro: true },
      { label: "Time tracking", free: true, pro: true },
      { label: "Online card payments (Stripe)", free: true, pro: true },
      { label: "Manual payment ledger", free: true, pro: true },
      { label: "Payment reminders", free: true, pro: true },
      { label: "Follow-ups", free: true, pro: true },
      { label: "Custom branding & logo", free: false, pro: true },
      { label: "Email invoices", free: false, pro: true },
      { label: "Recurring invoices", free: false, pro: true },
      { label: "Payment plans & collections", free: false, pro: true },
      { label: "Priority support", free: false, pro: true },
    ],
  },
];

/** Marketing site pricing cards — keep in sync with billing plans. */
export const LANDING_PLANS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    description: "Everything you need to invoice your first clients.",
    features: [
      "20 invoices per month",
      "2 companies · 2 team members",
      "Estimates with e-sign · clients & products",
      "Public links & viewed tracking",
      "Card payments via Stripe",
      "Record cash, check & bank payments",
      "Reminders, follow-ups & time tracking",
      "AI describe-to-invoice · 5 QR codes",
    ],
    cta: "Start for free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    cadence: "per month",
    description:
      "Unlimited invoicing that chases payment for you. $10/mo billed yearly.",
    features: [
      "Everything in Free, unlimited",
      "Email invoices & recurring auto-send",
      "Payment plans & collections chase",
      "Custom branding & logo on PDFs",
      "Unlimited QR codes",
      "Priority support",
    ],
    /** Prefer getLandingProCta(trialDays) at render time. */
    cta: "Upgrade to Pro",
    highlighted: true,
  },
] as const;

export function getLandingProCta(trialDays: number): string {
  return trialDays > 0 ? `Start ${trialDays}-day free trial` : "Upgrade to Pro";
}

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
