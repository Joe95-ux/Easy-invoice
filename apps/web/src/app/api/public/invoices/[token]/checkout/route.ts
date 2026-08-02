import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments";
import { INVOICE_CHECKOUT_META_TYPE, isStripeConfigured, stripe } from "@/lib/stripe";

type RouteContext = { params: Promise<{ token: string }> };

const BLOCKED_STATUSES = new Set(["DRAFT", "CANCELLED", "PAID"]);

export async function POST(_request: Request, context: RouteContext) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Online payments are not available right now" },
      { status: 503 },
    );
  }

  const { token } = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      client: { select: { email: true, name: true } },
      company: {
        select: {
          id: true,
          name: true,
          stripeConnectedAccountId: true,
          stripeConnectChargesEnabled: true,
          stripeConnectDetailsSubmitted: true,
        },
      },
      payments: { select: { amount: true } },
      installments: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (BLOCKED_STATUSES.has(invoice.status)) {
    return NextResponse.json(
      { error: "This invoice cannot accept online payment" },
      { status: 400 },
    );
  }

  const company = invoice.company;
  if (
    !company.stripeConnectedAccountId ||
    !company.stripeConnectChargesEnabled ||
    !company.stripeConnectDetailsSubmitted
  ) {
    return NextResponse.json(
      { error: "This business has not enabled online card payments yet" },
      { status: 400 },
    );
  }

  const summary = buildInvoicePaymentSummary(invoice);
  if (summary.balanceDue <= 0.001) {
    return NextResponse.json({ error: "This invoice is already paid" }, { status: 400 });
  }

  const amountCents = Math.round(summary.balanceDue * 100);
  if (amountCents < 50) {
    return NextResponse.json(
      { error: "Balance due is too small for card payment" },
      { status: 400 },
    );
  }

  const origin = await getAppOrigin();
  const currency = invoice.currency.trim().toLowerCase();

  const metadata = {
    type: INVOICE_CHECKOUT_META_TYPE,
    invoiceId: invoice.id,
    companyId: company.id,
    publicToken: token,
  };

  // Destination charge: platform Checkout session, funds transfer to the
  // company's Connect account with no application fee (Invoice Desk takes $0).
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: invoice.client?.email?.trim() || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: {
            name: `Invoice ${invoice.number}`,
            description: `Payment to ${company.name}`,
          },
        },
      },
    ],
    payment_intent_data: {
      // No application_fee_amount → Invoice Desk takes $0; funds go to the connected account.
      transfer_data: {
        destination: company.stripeConnectedAccountId,
      },
      metadata,
    },
    metadata,
    success_url: `${origin}/view/invoices/${token}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/view/invoices/${token}?canceled=1`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
