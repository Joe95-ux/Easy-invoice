import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { duplicateInvoice } from "@/lib/document-revisions/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;

  try {
    const invoice = await duplicateInvoice(member.companyId, member.id, id);
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not duplicate invoice";
    const status = message === "Invoice not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
