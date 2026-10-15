import { NextResponse } from "next/server";
import { requireApiWriter, parseJsonBody, validationError } from "@/lib/api/validation";
import { recordInvoiceRefund } from "@/lib/credit-notes";
import { recordInvoiceRefundSchema } from "@/lib/schemas/credit-note";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = recordInvoiceRefundSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const invoice = await recordInvoiceRefund({
      invoiceId: id,
      companyId: member.companyId,
      memberId: member.id,
      amount: parsed.data.amount,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : undefined,
      method: parsed.data.method,
      reference: parsed.data.reference,
      note: parsed.data.note,
      creditNoteId: parsed.data.creditNoteId,
      processStripe: parsed.data.processStripe,
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record refund";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
