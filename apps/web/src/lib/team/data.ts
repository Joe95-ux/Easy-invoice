import "server-only";

import { prisma } from "@/lib/db";
import { resolveMemberLoginEmails } from "@/lib/member-email";
import { canManageTeam } from "@/lib/team";
import type { TeamData } from "@/features/team/types";

const ROLE_ORDER = { OWNER: 0, ADMIN: 1, MEMBER: 2 } as const;

type GetTeamDataInput = {
  companyId: string;
  memberId: string;
  clerkId: string;
  role: TeamData["currentRole"];
};

export async function getTeamData({
  companyId,
  memberId,
  clerkId,
  role,
}: GetTeamDataInput): Promise<TeamData> {
  const [members, invites] = await Promise.all([
    prisma.companyMember.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    }),
    canManageTeam(role)
      ? prisma.companyInvite.findMany({
          where: {
            companyId,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const sortedMembers = [...members].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role],
  );
  const membersWithEmails = await resolveMemberLoginEmails(sortedMembers);

  return {
    currentMemberId: memberId,
    currentRole: role,
    members: membersWithEmails.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      isCurrentUser: row.clerkId === clerkId,
    })),
    invites: invites.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
