import { handleListRevisions } from "@/lib/document-revisions/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  return handleListRevisions("ESTIMATE", context);
}
