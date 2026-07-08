import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { recordInvoicePayment } from "@/lib/invoice-payments";
import { recordInvoicePaymentSchema } from "@/lib/schemas/invoice";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = recordInvoicePaymentSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const { invoice, confirmationEmail } = await recordInvoicePayment({
      invoiceId: id,
      companyId: member.companyId,
      memberId: member.id,
      amount: parsed.data.amount,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
      method: parsed.data.method,
      reference: parsed.data.reference,
      note: parsed.data.note,
    });

    return NextResponse.json({ invoice, confirmationEmail }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
