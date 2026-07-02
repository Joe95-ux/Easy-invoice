import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { duplicateDocumentFromRevision } from "@/lib/document-revisions/service";

type RouteContext = { params: Promise<{ id: string; revisionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { revisionId } = await context.params;

  try {
    const estimate = await duplicateDocumentFromRevision(
      member.companyId,
      member.id,
      revisionId,
    );
    return NextResponse.json({ estimate }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not duplicate version";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
