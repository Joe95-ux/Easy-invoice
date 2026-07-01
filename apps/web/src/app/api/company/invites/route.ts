import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiTeamManager,
  validationError,
} from "@/lib/api/validation";
import { getAppOrigin } from "@/lib/app-url";
import { sendTeamInviteEmail } from "@/lib/email";
import { prisma, UserRole } from "@/lib/db";
import { inviteMemberSchema } from "@/lib/schemas/team";
import {
  canAssignRole,
  inviteExpiresAt,
  normalizeInviteEmail,
} from "@/lib/team";

function createInviteToken(): string {
  return randomBytes(24).toString("hex");
}

export async function POST(request: Request) {
  const authResult = await requireApiTeamManager();
  if (authResult.response) return authResult.response;

  const { member } = authResult;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const email = normalizeInviteEmail(parsed.data.email);
  const role = parsed.data.role as UserRole;

  if (!canAssignRole(member.role, role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (normalizeInviteEmail(member.email) === email) {
    return NextResponse.json({ error: "You are already on this team" }, { status: 400 });
  }

  const existingMember = await prisma.companyMember.findFirst({
    where: { companyId: member.companyId, email: { equals: email, mode: "insensitive" } },
  });
  if (existingMember) {
    return NextResponse.json({ error: "This person is already a team member" }, { status: 409 });
  }

  await prisma.companyInvite.deleteMany({
    where: {
      companyId: member.companyId,
      email: { equals: email, mode: "insensitive" },
      acceptedAt: null,
    },
  });

  const token = createInviteToken();
  const invite = await prisma.companyInvite.create({
    data: {
      companyId: member.companyId,
      email,
      role,
      token,
      invitedById: member.id,
      expiresAt: inviteExpiresAt(),
    },
    include: { company: true },
  });

  const origin = await getAppOrigin();
  const inviteUrl = `${origin}/accept-invite/${token}`;

  try {
    await sendTeamInviteEmail({
      to: email,
      companyName: invite.company.name,
      role,
      inviteUrl,
      inviterEmail: member.email,
    });
  } catch (error) {
    await prisma.companyInvite.delete({ where: { id: invite.id } });
    const message = error instanceof Error ? error.message : "Failed to send invite email";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json(
    {
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
