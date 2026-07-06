import type { UserRole } from "@/lib/db";

export type TeamMember = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  isCurrentUser: boolean;
};

export type TeamInvite = {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: string;
  createdAt: string;
};

export type TeamData = {
  currentMemberId: string;
  currentRole: UserRole;
  members: TeamMember[];
  invites: TeamInvite[];
};

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export function roleBadgeVariant(role: UserRole) {
  if (role === "OWNER") return "default" as const;
  if (role === "ADMIN") return "info" as const;
  return "secondary" as const;
}
