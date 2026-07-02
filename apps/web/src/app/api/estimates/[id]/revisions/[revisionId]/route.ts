import { requireApiMember } from "@/lib/api/validation";
import { handleGetRevision } from "@/lib/document-revisions/api";

type RouteContext = { params: Promise<{ id: string; revisionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id, revisionId } = await context.params;
  return handleGetRevision("ESTIMATE", id, revisionId, member.companyId);
}
