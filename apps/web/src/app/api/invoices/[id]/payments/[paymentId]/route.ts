import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { deleteInvoicePayment } from "@/lib/invoice-payments";

type RouteContext = { params: Promise<{ id: string; paymentId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id, paymentId } = await context.params;

  try {
    const { invoice } = await deleteInvoicePayment({
      invoiceId: id,
      paymentId,
      companyId: member.companyId,
      memberId: member.id,
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete payment";
    const status = message === "Payment not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
