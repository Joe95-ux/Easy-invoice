import { NextResponse } from "next/server";
import { INVOICE_CHECKOUT_META_TYPE, isStripeConfigured, stripe } from "@/lib/stripe";
import { applyPaidInvoiceCheckoutSession } from "@/lib/stripe-invoice-checkout";

type RouteContext = { params: Promise<{ token: string }> };

/**
 * Idempotent fallback when the client returns from Checkout before the webhook runs.
 * Still requires a paid Stripe session — never trusts client-supplied amounts.
 */
export async function POST(request: Request, context: RouteContext) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Payments unavailable" }, { status: 503 });
  }

  const { token } = await context.params;
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
  if (session.metadata?.type !== INVOICE_CHECKOUT_META_TYPE) {
    return NextResponse.json({ error: "Not an invoice payment" }, { status: 400 });
  }
  if (session.metadata.publicToken !== token) {
    return NextResponse.json({ error: "Session mismatch" }, { status: 400 });
  }

  const result = await applyPaidInvoiceCheckoutSession(session);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Payment not completed", status: session.payment_status },
      { status: 402 },
    );
  }

  return NextResponse.json({
    ok: true,
    alreadyRecorded: Boolean(result.alreadyRecorded),
    refunded: Boolean(result.refunded),
  });
}
