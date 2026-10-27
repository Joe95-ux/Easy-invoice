import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiWriter, parseJsonBody, validationError } from "@/lib/api/validation";
import { getAppOrigin } from "@/lib/app-url";
import { buildEqualPaymentPlan, MIN_PLAN_BALANCE } from "@/lib/collections/advice";
import { prisma } from "@/lib/db";
import { publicDocumentUrl } from "@/lib/document-tokens";
import { isEmailConfigured, sendPaymentPlanOfferEmail } from "@/lib/email";
import {
  buildInvoicePaymentSummary,
  clearInvoiceInstallments,
  syncInvoiceInstallments,
  validateInstallments,
} from "@/lib/invoice-payments";
import { invoiceSettlementInclude } from "@/lib/invoice-payments-utils";
import { formatDate, formatMoney } from "@/lib/invoices";
import {
  assertProFeature,
  isPlanLimitError,
  planLimitResponse,
} from "@/lib/billing/entitlements";

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({
  parts: z.union([z.literal(2), z.literal(3)]),
  intervalDays: z.union([z.literal(7), z.literal(14), z.literal(30)]).optional(),
  notify: z.boolean().optional(),
});

/** Owner: split an unpaid invoice into a 2- or 3-part payment plan. */
export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiWriter();
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
      ...invoiceSettlementInclude,
      installments: { orderBy: { sortOrder: "asc" } },
      client: { select: { email: true } },
      company: { select: { name: true, email: true } },
    },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (["DRAFT", "CANCELLED", "PAID", "CREDITED"].includes(invoice.status)) {
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

  const intervalDays = parsed.data.intervalDays ?? 14;
  const installments = buildEqualPaymentPlan(
    Number(invoice.total),
    parsed.data.parts,
    new Date(),
    intervalDays,
  );
  const error = validateInstallments(installments, Number(invoice.total));
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  await syncInvoiceInstallments(invoice.id, installments);

  const updated = await prisma.invoice.findFirst({
    where: { id: invoice.id },
    include: {
      ...invoiceSettlementInclude,
      installments: { orderBy: { sortOrder: "asc" } },
    },
  });

  const emailed =
    parsed.data.notify === false
      ? false
      : await notifyClientOfPaymentPlan({
          to: invoice.client?.email,
          companyName: invoice.company.name,
          companyEmail: invoice.company.email,
          invoiceNumber: invoice.number,
          currency: invoice.currency,
          publicToken: invoice.publicToken,
          total: Number(invoice.total),
          installments,
        });

  return NextResponse.json({
    ok: true,
    parts: parsed.data.parts,
    intervalDays,
    emailed,
    summary: updated ? buildInvoicePaymentSummary(updated) : null,
  });
}

async function notifyClientOfPaymentPlan(input: {
  to?: string | null;
  companyName: string;
  companyEmail?: string | null;
  invoiceNumber: string;
  currency: string;
  publicToken?: string | null;
  total: number;
  installments: { dueDate: string; amount: number; label: string }[];
}): Promise<boolean> {
  const to = input.to?.trim();
  if (!to || !isEmailConfigured()) return false;

  try {
    const origin = await getAppOrigin();
    const viewUrl = input.publicToken
      ? publicDocumentUrl(origin, "invoice", input.publicToken)
      : undefined;
    await sendPaymentPlanOfferEmail({
      to,
      companyName: input.companyName,
      invoiceNumber: input.invoiceNumber,
      total: formatMoney(input.total, input.currency),
      installments: input.installments.map((row) => ({
        label: row.label,
        dueDateLabel: formatDate(row.dueDate),
        amount: formatMoney(row.amount, input.currency),
      })),
      viewUrl,
      replyTo: input.companyEmail,
    });
    return true;
  } catch (error) {
    console.error("Payment plan offer email failed", error);
    return false;
  }
}

/** Owner: remove an unpaid payment schedule. */
export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiWriter();
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
      ...invoiceSettlementInclude,
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
