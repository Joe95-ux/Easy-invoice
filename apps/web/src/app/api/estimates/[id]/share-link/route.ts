import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { getAppOrigin } from "@/lib/app-url";
import { publicDocumentUrl } from "@/lib/document-tokens";
import { ensureEstimatePublicToken } from "@/lib/public-documents";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const token = await ensureEstimatePublicToken(id, member.companyId);
  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const origin = await getAppOrigin();
  return NextResponse.json({
    token,
    url: publicDocumentUrl(origin, "estimate", token),
  });
}
