import { NextResponse } from "next/server";
import { requireApiTeamManager } from "@/lib/api/validation";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireApiTeamManager();
  if (authResult.response) return authResult.response;

  const { member } = authResult;
  const { id } = await context.params;

  const invite = await prisma.companyInvite.findFirst({
    where: {
      id,
      companyId: member.companyId,
      acceptedAt: null,
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  await prisma.companyInvite.delete({ where: { id: invite.id } });

  return NextResponse.json({ ok: true });
}
