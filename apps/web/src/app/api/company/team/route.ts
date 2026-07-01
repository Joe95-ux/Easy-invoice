import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { requireApiMember } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { resolveMemberLoginEmails } from "@/lib/member-email";

export async function GET() {
  const authResult = await requireApiMember();
  if (authResult.response) return authResult.response;

  const { member } = authResult;
  const { userId } = await auth();

  const [members, invites] = await Promise.all([
    prisma.companyMember.findMany({
      where: { companyId: member.companyId },
      orderBy: [{ createdAt: "asc" }],
    }),
    prisma.companyInvite.findMany({
      where: {
        companyId: member.companyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const roleOrder = { OWNER: 0, ADMIN: 1, MEMBER: 2 } as const;
  const sortedMembers = [...members].sort(
    (a, b) => roleOrder[a.role] - roleOrder[b.role],
  );
  const membersWithEmails = await resolveMemberLoginEmails(sortedMembers);

  return NextResponse.json({
    currentMemberId: member.id,
    currentRole: member.role,
    members: membersWithEmails.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      isCurrentUser: row.clerkId === userId,
    })),
    invites: invites.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })),
  });
}
