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
} from "@/lib/stripe-billing";

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
  try {
    const body = (await request.json()) as {
      action?: string;
      interval?: string;
    };
    if (body.action === "portal") action = "portal";
    if (body.interval === "yearly") interval = "yearly";
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
    const { url } = await createBillingPortalSession({
      customerId: company.stripeCustomerId,
    });
    return NextResponse.json({ url });
  }

  if (isPaidPlan(company.plan) && company.stripeSubscriptionId && company.stripeCustomerId) {
    const { url } = await createBillingPortalSession({
      customerId: company.stripeCustomerId,
    });
    return NextResponse.json({ url, managedExisting: true });
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
