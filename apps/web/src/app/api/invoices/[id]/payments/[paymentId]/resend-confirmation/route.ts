import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { resendPaymentConfirmation } from "@/lib/payment-confirmation";

const resendSchema = z.object({
  email: z.string().email().optional(),
});

type RouteContext = { params: Promise<{ id: string; paymentId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: invoiceId, paymentId } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await resendPaymentConfirmation({
    paymentId,
    invoiceId,
    companyId: member.companyId,
    memberId: member.id,
    recipientEmail: parsed.data.email,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    toEmail: result.toEmail,
    confirmationId: result.confirmationId,
    invoiceId,
  });
}
