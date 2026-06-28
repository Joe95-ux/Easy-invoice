import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { convertEstimateToInvoice } from "@/lib/estimate-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const result = await convertEstimateToInvoice(id, member.companyId);

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if ("error" in result && result.error === "cannot_convert") {
    return NextResponse.json(
      { error: "This estimate cannot be converted to an invoice" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    invoice: result.invoice,
    created: result.created,
  });
}
