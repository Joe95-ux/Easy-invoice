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
    success_url: `${origin}/settings/billing?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/settings/billing?billing=canceled`,
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

/** Deep-link destinations inside the Stripe Customer Portal. */
export type BillingPortalFlow =
  | "payment_method_update"
  | "subscription_cancel"
  | "subscription_update";

/**
 * Ensure a Customer Portal configuration exists with the features Invoice Desk needs.
 * Reuses an active configuration that already enables cancel / payment method / invoices;
 * otherwise creates one from Pro prices.
 */
export async function ensureBillingPortalConfiguration(): Promise<string | undefined> {
  const listed = await stripe.billingPortal.configurations.list({ limit: 100 });
  const suitable = listed.data.find(
    (config) =>
      config.active &&
      config.features.payment_method_update?.enabled &&
      config.features.invoice_history?.enabled &&
      config.features.subscription_cancel?.enabled,
  );
  if (suitable) return suitable.id;

  const monthlyPriceId = getProPriceId("monthly");
  const yearlyPriceId = getProPriceId("yearly");
  const priceIds = [monthlyPriceId, yearlyPriceId].filter(
    (id): id is string => Boolean(id),
  );

  let productId: string | null = null;
  if (monthlyPriceId) {
    const price = await stripe.prices.retrieve(monthlyPriceId);
    productId = typeof price.product === "string" ? price.product : price.product.id;
  }

  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Manage your Invoice Desk subscription",
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "address", "phone", "tax_id"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: [
            "too_expensive",
            "missing_features",
            "switched_service",
            "unused",
            "other",
          ],
        },
      },
      ...(productId && priceIds.length > 0
        ? {
            subscription_update: {
              enabled: true,
              default_allowed_updates: ["price" as const],
              proration_behavior: "create_prorations" as const,
              products: [{ product: productId, prices: priceIds }],
            },
          }
        : {}),
    },
  });

  return configuration.id;
}

export async function createBillingPortalSession(input: {
  customerId: string;
  subscriptionId?: string | null;
  flow?: BillingPortalFlow;
}): Promise<{ url: string }> {
  const origin = await getAppOrigin();
  const returnUrl = `${origin}/settings/billing?billing=portal`;

  let configuration: string | undefined;
  try {
    configuration = await ensureBillingPortalConfiguration();
  } catch (error) {
    // Fall back to the account default portal configuration in Stripe.
    console.warn("[stripe-billing] Could not ensure portal configuration", error);
  }

  const needsSubscription =
    input.flow === "subscription_cancel" || input.flow === "subscription_update";
  if (needsSubscription && !input.subscriptionId) {
    throw new Error("No active subscription to manage in the portal");
  }

  const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
    customer: input.customerId,
    return_url: returnUrl,
    ...(configuration ? { configuration } : {}),
  };

  if (input.flow === "payment_method_update") {
    sessionParams.flow_data = {
      type: "payment_method_update",
      after_completion: {
        type: "redirect",
        redirect: { return_url: returnUrl },
      },
    };
  } else if (input.flow === "subscription_cancel" && input.subscriptionId) {
    sessionParams.flow_data = {
      type: "subscription_cancel",
      subscription_cancel: { subscription: input.subscriptionId },
      after_completion: {
        type: "redirect",
        redirect: { return_url: returnUrl },
      },
    };
  } else if (input.flow === "subscription_update" && input.subscriptionId) {
    sessionParams.flow_data = {
      type: "subscription_update",
      subscription_update: { subscription: input.subscriptionId },
      after_completion: {
        type: "redirect",
        redirect: { return_url: returnUrl },
      },
    };
  }

  const session = await stripe.billingPortal.sessions.create(sessionParams);
  if (!session.url) {
    throw new Error("Could not open billing portal");
  }
  return { url: session.url };
}

export type BillingInvoiceSummary = {
  id: string;
  number: string | null;
  status: string | null;
  amountPaid: number;
  currency: string;
  created: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

/** Recent Invoice Desk SaaS invoices for the company's Stripe customer. */
export async function listRecentBillingInvoices(
  customerId: string,
  limit = 5,
): Promise<BillingInvoiceSummary[]> {
  const result = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return result.data
    .filter((invoice): invoice is typeof invoice & { id: string } => Boolean(invoice.id))
    .map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      created: invoice.created,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdf: invoice.invoice_pdf ?? null,
    }));
}

export function isPaidPlan(plan: string | null | undefined): boolean {
  const value = (plan ?? "FREE").toUpperCase();
  return value !== "FREE";
}

/**
 * Apply a completed SaaS Checkout Session to the company.
 * Idempotent fallback when the client returns before the webhook runs.
 */
export async function applySaasCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ ok: boolean; plan?: Plan }> {
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return { ok: false };
  }

  if (
    session.mode !== "subscription" &&
    session.metadata?.type !== SAAS_SUBSCRIPTION_META_TYPE
  ) {
    return { ok: false };
  }

  const companyId = session.metadata?.companyId;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!companyId || !customerId) {
    return { ok: false };
  }

  let plan: Plan | null = null;
  const metaPlan = session.metadata?.plan?.toUpperCase();
  if (metaPlan === "PRO" || metaPlan === "BUSINESS" || metaPlan === "SCALE") {
    plan = metaPlan;
  } else if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    plan = resolvePlanFromSubscription(subscription);
  }

  if (!plan) {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 1,
      expand: ["data.price"],
    });
    const price = lineItems.data[0]?.price;
    if (price && typeof price !== "string") {
      plan = resolvePlanFromPrice(price);
    }
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      ...(plan ? { plan } : {}),
    },
  });

  return { ok: true, plan: plan ?? undefined };
}

export type SubscriptionBillingState = {
  status: Stripe.Subscription.Status;
  cancelAtPeriodEnd: boolean;
  interval: BillingInterval;
};

export async function getSubscriptionBillingState(
  subscriptionId: string | null | undefined,
): Promise<SubscriptionBillingState | null> {
  if (!subscriptionId || !isStripeConfigured()) return null;
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const interval =
      subscription.items.data[0]?.price?.recurring?.interval === "year"
        ? "yearly"
        : "monthly";
    return {
      status: subscription.status,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      interval,
    };
  } catch {
    return null;
  }
}
