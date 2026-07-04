import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  parseJsonBody,
  requireApiTeamManager,
  validationError,
} from "@/lib/api/validation";
import { recordAuditEvent } from "@/lib/audit/service";
import { AuditAction, AuditCategory, prisma, UserRole } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";
import { updateMemberRoleSchema } from "@/lib/schemas/team";
import { canAssignRole, canModifyMember } from "@/lib/team";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireApiTeamManager();
  if (authResult.response) return authResult.response;

  const { member: actor } = authResult;
  const { id } = await context.params;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const newRole = parsed.data.role as UserRole;

  if (!canAssignRole(actor.role, newRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.companyMember.findFirst({
    where: { id, companyId: actor.companyId },
  });

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!canModifyMember(actor.role, target.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (target.role === UserRole.OWNER) {
    return NextResponse.json({ error: "Cannot change the owner role" }, { status: 400 });
  }

  const updated = await prisma.companyMember.update({
    where: { id: target.id },
    data: { role: newRole },
  });

  if (target.role !== newRole) {
    await recordAuditEvent({
      companyId: actor.companyId,
      memberId: actor.id,
      category: AuditCategory.TEAM,
      action: AuditAction.MEMBER_ROLE_CHANGED,
      summary: `Changed ${target.email} role: ${target.role} → ${newRole}`,
      entityType: "member",
      entityId: target.id,
      metadata: {
        email: target.email,
        fromRole: target.role,
        toRole: newRole,
      },
    });

    await createNotification({
      companyId: actor.companyId,
      recipientMemberIds: [target.id],
      type: "MEMBER_ROLE_CHANGED",
      title: "Your role was changed",
      body: `Your role has been changed from ${target.role.toLowerCase()} to ${newRole.toLowerCase()}`,
      linkUrl: "/settings",
    }).catch(() => undefined);
  }

  return NextResponse.json({
    member: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireApiTeamManager();
  if (authResult.response) return authResult.response;

  const { member: actor } = authResult;
  const { userId } = await auth();
  const { id } = await context.params;

  const target = await prisma.companyMember.findFirst({
    where: { id, companyId: actor.companyId },
  });

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.clerkId === userId) {
    return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
  }

  if (!canModifyMember(actor.role, target.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (target.role === UserRole.OWNER) {
    const ownerCount = await prisma.companyMember.count({
      where: { companyId: actor.companyId, role: UserRole.OWNER },
    });
    if (ownerCount <= 1) {
      return NextResponse.json({ error: "Cannot remove the only owner" }, { status: 400 });
    }
  }

  await prisma.companyMember.delete({ where: { id: target.id } });

  await recordAuditEvent({
    companyId: actor.companyId,
    memberId: actor.id,
    category: AuditCategory.TEAM,
    action: AuditAction.MEMBER_REMOVED,
    summary: `Removed ${target.email} (${target.role})`,
    entityType: "member",
    entityId: target.id,
    metadata: {
      email: target.email,
      role: target.role,
      name: target.name,
    },
  });

  return NextResponse.json({ ok: true });
}
