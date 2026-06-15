import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const planByPriceLookup: Record<string, "PRO" | "BUSINESS" | "SCALE"> = {
  // Set these to your Stripe Price lookup keys
  pro_monthly: "PRO",
  pro_yearly: "PRO",
  business_monthly: "BUSINESS",
  business_yearly: "BUSINESS",
  scale_monthly: "SCALE",
  scale_yearly: "SCALE",
};

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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string | null;
      const subscriptionId = session.subscription as string | null;
      const companyId = session.metadata?.companyId;

      if (companyId && customerId) {
        await prisma.company.update({
          where: { id: companyId },
          data: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
          },
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const price = subscription.items.data[0]?.price;
      const lookupKey = price?.lookup_key ?? "";
      const plan = planByPriceLookup[lookupKey];

      if (plan) {
        await prisma.company.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            plan,
            stripeSubscriptionId: subscription.id,
          },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      await prisma.company.updateMany({
        where: { stripeCustomerId: customerId },
        data: { plan: "FREE", stripeSubscriptionId: null },
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
