import { NextResponse } from "next/server";
import { requireApiCompanyAdmin } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  createBillingPortalSession,
  createProCheckoutSession,
  getProPriceId,
  isPaidPlan,
  isSubscriptionBillingConfigured,
  type BillingInterval,
  type BillingPortalFlow,
} from "@/lib/stripe-billing";

const PORTAL_FLOWS = new Set<BillingPortalFlow>([
  "payment_method_update",
  "subscription_cancel",
  "subscription_update",
]);

function parsePortalFlow(value: unknown): BillingPortalFlow | undefined {
  if (typeof value !== "string") return undefined;
  return PORTAL_FLOWS.has(value as BillingPortalFlow)
    ? (value as BillingPortalFlow)
    : undefined;
}

export async function GET() {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: member.companyId },
    select: {
      plan: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  return NextResponse.json({
    configured: isSubscriptionBillingConfigured(),
    hasYearly: Boolean(getProPriceId("yearly")),
    plan: company.plan,
    hasCustomer: Boolean(company.stripeCustomerId),
    hasSubscription: Boolean(company.stripeSubscriptionId),
    isPaid: isPaidPlan(company.plan),
  });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  if (!isSubscriptionBillingConfigured()) {
    return NextResponse.json(
      { error: "Subscription billing is not configured" },
      { status: 503 },
    );
  }

  let action: "checkout" | "portal" = "checkout";
  let interval: BillingInterval = "monthly";
  let flow: BillingPortalFlow | undefined;
  try {
    const body = (await request.json()) as {
      action?: string;
      interval?: string;
      flow?: string;
    };
    if (body.action === "portal") action = "portal";
    if (body.interval === "yearly") interval = "yearly";
    flow = parsePortalFlow(body.flow);
  } catch {
    // default checkout monthly
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: member.companyId },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (action === "portal") {
    if (!company.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account yet — upgrade to Pro first" },
        { status: 400 },
      );
    }
    try {
      const { url } = await createBillingPortalSession({
        customerId: company.stripeCustomerId,
        subscriptionId: company.stripeSubscriptionId,
        flow,
      });
      return NextResponse.json({ url });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not open billing portal";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (isPaidPlan(company.plan) && company.stripeSubscriptionId && company.stripeCustomerId) {
    try {
      const { url } = await createBillingPortalSession({
        customerId: company.stripeCustomerId,
        subscriptionId: company.stripeSubscriptionId,
        flow: flow ?? "subscription_update",
      });
      return NextResponse.json({ url, managedExisting: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not open billing portal";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (interval === "yearly" && !getProPriceId("yearly")) {
    return NextResponse.json(
      { error: "Yearly Pro pricing is not available" },
      { status: 400 },
    );
  }

  try {
    const { url } = await createProCheckoutSession({
      companyId: company.id,
      companyName: company.name,
      email: company.email ?? member.email,
      stripeCustomerId: company.stripeCustomerId,
      interval,
    });
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start checkout";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
