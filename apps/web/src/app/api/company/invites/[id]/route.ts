import { NextResponse } from "next/server";
import { requireApiTeamManager } from "@/lib/api/validation";
import { recordAuditEvent } from "@/lib/audit/service";
import { AuditAction, AuditCategory, prisma } from "@/lib/db";

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

  await recordAuditEvent({
    companyId: member.companyId,
    memberId: member.id,
    category: AuditCategory.TEAM,
    action: AuditAction.MEMBER_INVITE_CANCELLED,
    summary: `Cancelled invite for ${invite.email}`,
    entityType: "invite",
    entityId: invite.id,
    metadata: { email: invite.email, role: invite.role },
  });

  return NextResponse.json({ ok: true });
}
