import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  parseJsonBody,
  requireApiTeamManager,
  validationError,
} from "@/lib/api/validation";
import { prisma, UserRole } from "@/lib/db";
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

  return NextResponse.json({ ok: true });
}
