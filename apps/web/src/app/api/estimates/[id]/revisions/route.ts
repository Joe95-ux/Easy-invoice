import type { NextRequest } from "next/server";
import { handleListRevisions } from "@/lib/document-revisions/api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return handleListRevisions("ESTIMATE", context, request);
}
