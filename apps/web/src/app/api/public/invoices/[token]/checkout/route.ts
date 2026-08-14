import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { getAppOrigin } from "@/lib/app-url";
import { resolvePublicCheckoutAmount } from "@/lib/collections/advice";
import { prisma } from "@/lib/db";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments";
import { INVOICE_CHECKOUT_META_TYPE, isStripeConfigured, stripe } from "@/lib/stripe";

type RouteContext = { params: Promise<{ token: string }> };

const BLOCKED_STATUSES = new Set(["DRAFT", "CANCELLED", "PAID"]);

const checkoutSchema = z.object({
  /** Optional partial amount (major units). Defaults to full balance due. */
  amount: z.number().positive().optional(),
});

export async function POST(request: Request, context: RouteContext) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Online payments are not available right now" },
      { status: 503 },
    );
  }

  const { token } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = checkoutSchema.safeParse(body ?? {});
  if (!parsed.success) return validationError(parsed.error);

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
  const resolved = resolvePublicCheckoutAmount({
    balanceDue: summary.balanceDue,
    nextDueAmount: summary.nextDueAmount,
    hasInstallments: summary.installments.length > 0,
    requested: parsed.data.amount,
  });
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const chargeAmount = resolved.amount;
  const amountCents = Math.round(chargeAmount * 100);

  const origin = await getAppOrigin();
  const currency = invoice.currency.trim().toLowerCase();
  const isPartial = chargeAmount < summary.balanceDue - 0.001;

  const metadata = {
    type: INVOICE_CHECKOUT_META_TYPE,
    invoiceId: invoice.id,
    companyId: company.id,
    publicToken: token,
  };

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
            description: isPartial
              ? `Partial payment to ${company.name}`
              : `Payment to ${company.name}`,
          },
        },
      },
    ],
    payment_intent_data: {
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

  return NextResponse.json({
    url: session.url,
    sessionId: session.id,
    amount: chargeAmount,
  });
}
