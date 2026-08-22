import { NextResponse } from "next/server";
import { requireApiCompanyAdmin } from "@/lib/api/validation";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import {
  applySaasCheckoutSession,
  SAAS_SUBSCRIPTION_META_TYPE,
} from "@/lib/stripe-billing";

/**
 * Idempotent fallback when the admin returns from Checkout before the webhook runs.
 */
export async function POST(request: Request) {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing unavailable" }, { status: 503 });
  }

  let sessionId = "";
  try {
    const body = (await request.json()) as { sessionId?: string };
    sessionId = body.sessionId?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (
    session.mode !== "subscription" &&
    session.metadata?.type !== SAAS_SUBSCRIPTION_META_TYPE
  ) {
    return NextResponse.json({ error: "Not a subscription checkout" }, { status: 400 });
  }

  if (session.metadata?.companyId !== member.companyId) {
    return NextResponse.json({ error: "Session mismatch" }, { status: 403 });
  }

  const result = await applySaasCheckoutSession(session);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Checkout not completed", status: session.payment_status },
      { status: 402 },
    );
  }

  return NextResponse.json({
    ok: true,
    plan: result.plan ?? null,
  });
}
