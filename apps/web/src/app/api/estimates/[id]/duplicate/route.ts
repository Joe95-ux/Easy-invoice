import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { duplicateEstimate } from "@/lib/document-revisions/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;

  try {
    const estimate = await duplicateEstimate(member.companyId, member.id, id);
    return NextResponse.json({ estimate }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not duplicate estimate";
    const status = message === "Estimate not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
