import type { Plan } from "@easy-invoice/db";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";
import { isStripeConfigured, stripe } from "@/lib/stripe";

export const SAAS_SUBSCRIPTION_META_TYPE = "saas_subscription";

const LOOKUP_KEY_TO_PLAN: Record<string, Plan> = {
  pro_monthly: "PRO",
  pro_yearly: "PRO",
  business_monthly: "BUSINESS",
  business_yearly: "BUSINESS",
  scale_monthly: "SCALE",
  scale_yearly: "SCALE",
};

export type BillingInterval = "monthly" | "yearly";

export function getProPriceId(interval: BillingInterval): string | null {
  const key =
    interval === "yearly" ? "STRIPE_PRICE_PRO_YEARLY" : "STRIPE_PRICE_PRO_MONTHLY";
  return process.env[key]?.trim() || null;
}

export function isSubscriptionBillingConfigured(): boolean {
  return isStripeConfigured() && Boolean(getProPriceId("monthly"));
}

export function getProTrialDays(): number {
  const raw = process.env.STRIPE_PRO_TRIAL_DAYS?.trim();
  if (!raw) return 0;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Map a Stripe Price to an app Plan via env price IDs or lookup keys. */
export function resolvePlanFromPrice(price: Stripe.Price | null | undefined): Plan | null {
  if (!price) return null;

  const monthly = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
  const yearly = process.env.STRIPE_PRICE_PRO_YEARLY?.trim();
  if (price.id === monthly || price.id === yearly) return "PRO";

  const businessMonthly = process.env.STRIPE_PRICE_BUSINESS_MONTHLY?.trim();
  const businessYearly = process.env.STRIPE_PRICE_BUSINESS_YEARLY?.trim();
  if (price.id === businessMonthly || price.id === businessYearly) return "BUSINESS";

  const scaleMonthly = process.env.STRIPE_PRICE_SCALE_MONTHLY?.trim();
  const scaleYearly = process.env.STRIPE_PRICE_SCALE_YEARLY?.trim();
  if (price.id === scaleMonthly || price.id === scaleYearly) return "SCALE";

  if (price.lookup_key && LOOKUP_KEY_TO_PLAN[price.lookup_key]) {
    return LOOKUP_KEY_TO_PLAN[price.lookup_key];
  }

  return null;
}

export function resolvePlanFromSubscription(
  subscription: Stripe.Subscription,
): Plan | null {
  const price = subscription.items.data[0]?.price;
  return resolvePlanFromPrice(price);
}

export async function ensureStripeCustomer(input: {
  companyId: string;
  email?: string | null;
  name?: string | null;
  existingCustomerId?: string | null;
}): Promise<string> {
  if (input.existingCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(input.existingCustomerId);
      if (!("deleted" in existing && existing.deleted)) {
        return existing.id;
      }
    } catch {
      // Stale id — create a new customer below.
    }
    await prisma.company.update({
      where: { id: input.companyId },
      data: { stripeCustomerId: null },
    });
  }

  const customer = await stripe.customers.create({
    email: input.email?.trim() || undefined,
    name: input.name?.trim() || undefined,
    metadata: { companyId: input.companyId },
  });

  await prisma.company.update({
    where: { id: input.companyId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createProCheckoutSession(input: {
  companyId: string;
  companyName: string;
  email?: string | null;
  stripeCustomerId?: string | null;
  interval: BillingInterval;
}): Promise<{ url: string }> {
  const priceId = getProPriceId(input.interval);
  if (!priceId) {
    throw new Error(
      input.interval === "yearly"
        ? "Yearly Pro pricing is not configured"
        : "Monthly Pro pricing is not configured",
    );
  }

  const customerId = await ensureStripeCustomer({
    companyId: input.companyId,
    email: input.email,
    name: input.companyName,
    existingCustomerId: input.stripeCustomerId,
  });

  const origin = await getAppOrigin();
  const trialDays = getProTrialDays();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${origin}/settings?billing=success#settings-billing`,
    cancel_url: `${origin}/settings?billing=canceled#settings-billing`,
    metadata: {
      type: SAAS_SUBSCRIPTION_META_TYPE,
      companyId: input.companyId,
      plan: "PRO",
      interval: input.interval,
    },
    subscription_data: {
      metadata: {
        type: SAAS_SUBSCRIPTION_META_TYPE,
        companyId: input.companyId,
        plan: "PRO",
      },
      ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
    },
  });

  if (!session.url) {
    throw new Error("Could not start checkout");
  }

  return { url: session.url };
}

export async function createBillingPortalSession(input: {
  customerId: string;
}): Promise<{ url: string }> {
  const origin = await getAppOrigin();
  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: `${origin}/settings#settings-billing`,
  });
  return { url: session.url };
}

export function isPaidPlan(plan: string | null | undefined): boolean {
  const value = (plan ?? "FREE").toUpperCase();
  return value !== "FREE";
}
