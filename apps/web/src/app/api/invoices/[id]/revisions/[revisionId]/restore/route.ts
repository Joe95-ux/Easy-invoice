import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { restoreDocumentRevision } from "@/lib/document-revisions/service";

type RouteContext = { params: Promise<{ id: string; revisionId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { revisionId } = await context.params;

  try {
    const invoice = await restoreDocumentRevision(
      member.companyId,
      member.id,
      revisionId,
    );
    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not restore version";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
