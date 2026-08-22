import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { buildEqualPaymentPlan, MIN_PLAN_BALANCE } from "@/lib/collections/advice";
import { prisma } from "@/lib/db";
import {
  buildInvoicePaymentSummary,
  clearInvoiceInstallments,
  syncInvoiceInstallments,
  validateInstallments,
} from "@/lib/invoice-payments";
import {
  assertProFeature,
  isPlanLimitError,
  planLimitResponse,
} from "@/lib/billing/entitlements";

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({
  parts: z.union([z.literal(2), z.literal(3)]),
});

/** Owner: split an unpaid invoice into a 2- or 3-part payment plan. */
export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    assertProFeature(member.company.plan, "payment_plans");
  } catch (error) {
    if (isPlanLimitError(error)) return planLimitResponse(error);
    throw error;
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId: member.companyId },
    include: {
      payments: { select: { amount: true } },
      installments: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (["DRAFT", "CANCELLED", "PAID"].includes(invoice.status)) {
    return NextResponse.json(
      { error: "This invoice cannot use a payment plan" },
      { status: 400 },
    );
  }

  const summary = buildInvoicePaymentSummary(invoice);
  if (summary.amountPaid > 0.001) {
    return NextResponse.json(
      { error: "Payment plans can only be set before any payment is recorded" },
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
      { error: "Balance is too small to split into a plan" },
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

  const updated = await prisma.invoice.findFirst({
    where: { id: invoice.id },
    include: {
      payments: { select: { amount: true } },
      installments: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({
    ok: true,
    parts: parsed.data.parts,
    summary: updated ? buildInvoicePaymentSummary(updated) : null,
  });
}

/** Owner: remove an unpaid payment schedule. */
export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  try {
    assertProFeature(member.company.plan, "payment_plans");
  } catch (error) {
    if (isPlanLimitError(error)) return planLimitResponse(error);
    throw error;
  }

  const { id } = await context.params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId: member.companyId },
    include: {
      payments: { select: { amount: true } },
      installments: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const summary = buildInvoicePaymentSummary(invoice);
  if (summary.installments.length === 0) {
    return NextResponse.json({ error: "No payment schedule to remove" }, { status: 400 });
  }
  if (summary.amountPaid > 0.001) {
    return NextResponse.json(
      { error: "Cannot remove a plan after payments have been recorded" },
      { status: 400 },
    );
  }

  await clearInvoiceInstallments(invoice.id);

  return NextResponse.json({ ok: true });
}
