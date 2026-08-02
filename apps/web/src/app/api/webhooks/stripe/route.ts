import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { Plan } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import {
  companyConnectUpdateFromAccount,
  INVOICE_CHECKOUT_META_TYPE,
  stripe,
} from "@/lib/stripe";
import {
  resolvePlanFromPrice,
  resolvePlanFromSubscription,
  SAAS_SUBSCRIPTION_META_TYPE,
} from "@/lib/stripe-billing";
import { applyPaidInvoiceCheckoutSession } from "@/lib/stripe-invoice-checkout";

async function handleInvoiceCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.metadata?.type !== INVOICE_CHECKOUT_META_TYPE) return;
  await applyPaidInvoiceCheckoutSession(session);
}

async function handleConnectAccountUpdated(account: Stripe.Account) {
  const companyId = account.metadata?.companyId;
  const update = companyConnectUpdateFromAccount(account);

  if (companyId) {
    await prisma.company.updateMany({
      where: { id: companyId },
      data: {
        stripeConnectDetailsSubmitted: update.stripeConnectDetailsSubmitted,
        stripeConnectChargesEnabled: update.stripeConnectChargesEnabled,
        stripeConnectPayoutsEnabled: update.stripeConnectPayoutsEnabled,
        stripeConnectedAccountId: account.id,
      },
    });
    return;
  }

  await prisma.company.updateMany({
    where: { stripeConnectedAccountId: account.id },
    data: {
      stripeConnectDetailsSubmitted: update.stripeConnectDetailsSubmitted,
      stripeConnectChargesEnabled: update.stripeConnectChargesEnabled,
      stripeConnectPayoutsEnabled: update.stripeConnectPayoutsEnabled,
    },
  });
}

async function resolvePlanForSubscriptionCheckout(
  session: Stripe.Checkout.Session,
): Promise<Plan | null> {
  const metaPlan = session.metadata?.plan?.toUpperCase();
  if (metaPlan === "PRO" || metaPlan === "BUSINESS" || metaPlan === "SCALE") {
    return metaPlan;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const fromSub = resolvePlanFromSubscription(subscription);
    if (fromSub) return fromSub;
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 1,
    expand: ["data.price"],
  });
  const price = lineItems.data[0]?.price;
  if (price && typeof price !== "string") {
    return resolvePlanFromPrice(price);
  }

  return null;
}

async function handleSaasCheckoutSession(session: Stripe.Checkout.Session) {
  // Trials may complete with no_payment_required; never upgrade on unpaid.
  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return;
  }

  const companyId = session.metadata?.companyId;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!companyId || !customerId) return;

  const plan = await resolvePlanForSubscriptionCheckout(session);

  await prisma.company.update({
    where: { id: companyId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      ...(plan ? { plan } : {}),
    },
  });
}

async function syncCompanyPlanFromSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const metaCompanyId = subscription.metadata?.companyId;
  const plan = resolvePlanFromSubscription(subscription);
  const status = subscription.status;
  const active =
    status === "active" || status === "trialing" || status === "past_due";
  const canceled = status === "canceled" || status === "unpaid";

  let data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string | null;
    plan?: Plan;
  } = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
  };

  if (active && plan) {
    data = { ...data, plan };
  } else if (canceled) {
    data = {
      stripeCustomerId: customerId,
      plan: "FREE",
      stripeSubscriptionId: null,
    };
  }

  if (metaCompanyId) {
    await prisma.company.updateMany({
      where: { id: metaCompanyId },
      data,
    });
    return;
  }

  await prisma.company.updateMany({
    where: { stripeCustomerId: customerId },
    data,
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook config" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === INVOICE_CHECKOUT_META_TYPE) {
          await handleInvoiceCheckoutSession(session);
          break;
        }
        if (
          session.mode === "subscription" ||
          session.metadata?.type === SAAS_SUBSCRIPTION_META_TYPE
        ) {
          await handleSaasCheckoutSession(session);
        }
        break;
      }
      case "account.updated": {
        await handleConnectAccountUpdated(event.data.object as Stripe.Account);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await syncCompanyPlanFromSubscription(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const companyId = subscription.metadata?.companyId;

        if (companyId) {
          await prisma.company.updateMany({
            where: { id: companyId },
            data: { plan: "FREE", stripeSubscriptionId: null },
          });
        } else {
          await prisma.company.updateMany({
            where: { stripeCustomerId: customerId },
            data: { plan: "FREE", stripeSubscriptionId: null },
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("[stripe webhook]", event.type, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
