import { NextResponse } from "next/server";
import { z } from "zod";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import {
  detachInvoicePaymentQr,
  getCompanyPaymentLinkMethods,
  getInvoicePaymentQr,
  upsertInvoicePaymentQr,
} from "@/lib/invoice-payment-qr";

type RouteContext = { params: Promise<{ id: string }> };

const upsertSchema = z.object({
  paymentUrl: z.string().min(1).max(2000),
  methodLabel: z.string().max(40).optional(),
});

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const [paymentQr, paymentLinkMethods] = await Promise.all([
    getInvoicePaymentQr(id, member.companyId),
    getCompanyPaymentLinkMethods(member.companyId),
  ]);

  return NextResponse.json({ paymentQr, paymentLinkMethods });
}

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await upsertInvoicePaymentQr({
    invoiceId: id,
    companyId: member.companyId,
    memberId: member.id,
    paymentUrl: parsed.data.paymentUrl,
    methodLabel: parsed.data.methodLabel,
  });

  if ("error" in result) {
    const status = result.error === "Invoice not found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ paymentQr: result });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const removed = await detachInvoicePaymentQr(id, member.companyId);
  if (!removed) {
    return NextResponse.json({ error: "No payment QR linked to this invoice" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
