import { NextResponse } from "next/server";
import { requireApiCompanyAdmin } from "@/lib/api/validation";
import {
  createConnectLoginLink,
  createConnectOnboardingLink,
  ensureConnectedExpressAccount,
  getCompanyConnectStatus,
} from "@/lib/stripe-connect";
import { isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function GET() {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  if (!isStripeConfigured()) {
    return NextResponse.json({
      configured: false,
      status: {
        accountId: null,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        readyForPayments: false,
      },
    });
  }

  const status = await getCompanyConnectStatus(member.companyId);
  return NextResponse.json({ configured: true, status });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured on this server" },
      { status: 503 },
    );
  }

  let action: "onboard" | "login" = "onboard";
  try {
    const body = (await request.json()) as { action?: string };
    if (body.action === "login") action = "login";
  } catch {
    // empty body → onboard
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: member.companyId },
    select: {
      id: true,
      email: true,
      country: true,
      stripeConnectedAccountId: true,
      stripeConnectChargesEnabled: true,
      stripeConnectDetailsSubmitted: true,
    },
  });

  if (action === "login") {
    if (!company.stripeConnectedAccountId || !company.stripeConnectDetailsSubmitted) {
      return NextResponse.json(
        { error: "Finish Stripe onboarding before opening the dashboard" },
        { status: 400 },
      );
    }
    const url = await createConnectLoginLink(company.stripeConnectedAccountId);
    return NextResponse.json({ url });
  }

  const accountId = await ensureConnectedExpressAccount({
    companyId: company.id,
    country: company.country,
    email: company.email,
  });

  const url = await createConnectOnboardingLink({
    companyId: company.id,
    accountId,
  });

  return NextResponse.json({ url, accountId });
}
