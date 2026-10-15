import { NextResponse } from "next/server";
import { requireApiWriter, parseJsonBody, validationError } from "@/lib/api/validation";
import { voidInvoice } from "@/lib/credit-notes";
import { voidInvoiceSchema } from "@/lib/schemas/credit-note";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = voidInvoiceSchema.safeParse(body ?? {});
  if (!parsed.success) return validationError(parsed.error);

  try {
    const creditNote = await voidInvoice({
      invoiceId: id,
      companyId: member.companyId,
      memberId: member.id,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ creditNote }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not void invoice";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
