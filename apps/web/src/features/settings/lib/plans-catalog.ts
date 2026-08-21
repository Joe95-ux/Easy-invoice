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
      "Reminders, follow-ups & time tracking",
      "5 QR codes · AI describe-to-invoice",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    summary: "For businesses that bill every day",
    features: [
      "Unlimited invoices, estimates & QR codes",
      "Unlimited companies & team members",
      "Custom branding & logo on PDFs",
      "Email invoices & payment tracking",
      "Recurring invoices",
      "Payment plans & collections tools",
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
    features: [
      "Unlimited invoices",
      "Estimates with e-sign",
      "Recurring invoices",
      "AI draft",
    ],
  },
  {
    title: "Get paid",
    features: [
      "Unlimited QR codes",
      "Custom branding",
      "Email & payment tracking",
      "Payment plans",
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
      { label: "Payment reminders", free: true, pro: true },
      { label: "Follow-ups", free: true, pro: true },
      { label: "Custom branding & logo", free: false, pro: true },
      { label: "Email invoices", free: false, pro: true },
      { label: "Payment tracking", free: false, pro: true },
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
    description: "For busy businesses that bill every day. $10/mo billed yearly.",
    features: [
      "Everything in Free, unlimited",
      "Custom branding & logo on PDFs",
      "Email invoices & payment tracking",
      "Recurring invoices",
      "Payment plans & collections",
      "Unlimited QR codes",
      "Priority support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
] as const;

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
