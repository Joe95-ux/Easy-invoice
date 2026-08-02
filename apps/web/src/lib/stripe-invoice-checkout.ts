import { Prisma } from "@easy-invoice/db";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { buildInvoicePaymentSummary, recordInvoicePayment } from "@/lib/invoice-payments";
import { stripe } from "@/lib/stripe";

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function refundPaidCheckoutSession(session: Stripe.Checkout.Session, reason: string) {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    console.warn("[stripe invoice pay] cannot refund session without PI", session.id, reason);
    return;
  }

  try {
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: "duplicate",
    });
    console.warn("[stripe invoice pay] refunded checkout session", session.id, reason);
  } catch (error) {
    console.error("[stripe invoice pay] refund failed", session.id, reason, error);
  }
}

/**
 * Apply a paid Checkout Session to an invoice. Idempotent. Refunds duplicate /
 * over-balance charges so webhook handlers can ack without leaving a double charge.
 */
export async function applyPaidInvoiceCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ ok: boolean; alreadyRecorded?: boolean; refunded?: boolean }> {
  if (session.payment_status !== "paid") {
    return { ok: false };
  }

  const invoiceId = session.metadata?.invoiceId;
  const companyId = session.metadata?.companyId;
  if (!invoiceId || !companyId) {
    return { ok: false };
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      payments: { select: { amount: true, stripeCheckoutSessionId: true } },
      installments: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!invoice) {
    console.error("[stripe invoice pay] invoice not found for session", session.id);
    return { ok: false };
  }

  if (
    session.metadata?.publicToken &&
    invoice.publicToken &&
    session.metadata.publicToken !== invoice.publicToken
  ) {
    console.error("[stripe invoice pay] public token mismatch", session.id);
    return { ok: false };
  }

  const existing = invoice.payments.find(
    (row) => row.stripeCheckoutSessionId === session.id,
  );
  if (existing) {
    return { ok: true, alreadyRecorded: true };
  }

  const amountTotal = session.amount_total;
  if (amountTotal == null || amountTotal <= 0) {
    return { ok: false };
  }

  const amount = Math.round(amountTotal) / 100;
  const summary = buildInvoicePaymentSummary(invoice);

  if (invoice.status === "PAID" || summary.balanceDue <= 0.001) {
    await refundPaidCheckoutSession(session, "invoice already paid");
    return { ok: true, refunded: true };
  }

  if (amount > summary.balanceDue + 0.001) {
    await refundPaidCheckoutSession(session, "amount exceeds balance due");
    return { ok: true, refunded: true };
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  try {
    const result = await recordInvoicePayment({
      invoiceId,
      companyId,
      memberId: null,
      amount,
      method: "CARD",
      reference: session.id,
      note: "Paid online via Stripe",
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
    });
    return { ok: true, alreadyRecorded: result.alreadyRecorded };
  } catch (error) {
    if (isUniqueConflict(error)) {
      return { ok: true, alreadyRecorded: true };
    }

    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("already fully paid") ||
      message.includes("cannot exceed the balance")
    ) {
      await refundPaidCheckoutSession(session, message);
      return { ok: true, refunded: true };
    }

    throw error;
  }
}
