import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { inviteClientToPortal } from "@/lib/portal/auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const result = await inviteClientToPortal({
    clientId: id,
    companyId: member.companyId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    email: result.email,
    ...(result.debugUrl ? { debugUrl: result.debugUrl } : {}),
  });
}
