import { NextResponse } from "next/server";
import { requireApiWriter } from "@/lib/api/validation";
import { isPlanLimitError, planLimitResponse } from "@/lib/billing/entitlements";
import { applyInvoiceLateFee } from "@/lib/late-fees";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const { id } = await context.params;
  try {
    const lateFee = await applyInvoiceLateFee({
      invoiceId: id,
      companyId: member.companyId,
      memberId: member.id,
      source: "MANUAL",
    });
    return NextResponse.json({ lateFee }, { status: 201 });
  } catch (error) {
    if (isPlanLimitError(error)) return planLimitResponse(error);
    const message = error instanceof Error ? error.message : "Could not apply late fee";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
