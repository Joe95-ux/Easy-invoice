import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { buildEqualPaymentPlan, MIN_PLAN_BALANCE } from "@/lib/collections/advice";
import { prisma } from "@/lib/db";
import {
  buildInvoicePaymentSummary,
  syncInvoiceInstallments,
  validateInstallments,
} from "@/lib/invoice-payments";

type RouteContext = { params: Promise<{ token: string }> };

const schema = z.object({
  parts: z.union([z.literal(2), z.literal(3)]),
});

/**
 * Client self-serve payment plan — only when the company has enabled
 * `clientPaymentPlansEnabled` as policy.
 */
export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      payments: { select: { amount: true } },
      installments: { orderBy: { sortOrder: "asc" } },
      company: {
        select: {
          clientPaymentPlansEnabled: true,
          stripeConnectedAccountId: true,
          stripeConnectChargesEnabled: true,
          stripeConnectDetailsSubmitted: true,
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (!invoice.company.clientPaymentPlansEnabled) {
    return NextResponse.json(
      { error: "This business has not enabled client payment plans" },
      { status: 403 },
    );
  }

  if (["DRAFT", "CANCELLED", "PAID"].includes(invoice.status)) {
    return NextResponse.json(
      { error: "This invoice cannot use a payment plan" },
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
      { error: "Online card payments are not available for this invoice" },
      { status: 400 },
    );
  }

  const summary = buildInvoicePaymentSummary(invoice);
  if (summary.amountPaid > 0.001) {
    return NextResponse.json(
      { error: "A payment plan is only available before the first payment" },
      { status: 400 },
    );
  }
  if (summary.installments.length > 0) {
    return NextResponse.json(
      { error: "This invoice already has a payment schedule" },
      { status: 400 },
    );
  }
  if (summary.balanceDue < MIN_PLAN_BALANCE) {
    return NextResponse.json(
      { error: "This balance is too small to split" },
      { status: 400 },
    );
  }

  const installments = buildEqualPaymentPlan(
    Number(invoice.total),
    parsed.data.parts,
    new Date(),
  );
  const error = validateInstallments(installments, Number(invoice.total));
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  await syncInvoiceInstallments(invoice.id, installments);

  const updated = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    include: {
      payments: { select: { amount: true } },
      installments: { orderBy: { sortOrder: "asc" } },
    },
  });

  const next = updated ? buildInvoicePaymentSummary(updated) : summary;

  return NextResponse.json({
    ok: true,
    parts: parsed.data.parts,
    nextDueAmount: next.nextDueAmount,
    balanceDue: next.balanceDue,
  });
}
