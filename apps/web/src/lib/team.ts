import { UserRole } from "@/lib/db";

export const INVITE_EXPIRY_DAYS = 7;

export function canManageTeam(role: UserRole): boolean {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

export function canManageCompanySettings(role: UserRole): boolean {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

/** Create/edit/send documents and record payments. */
export function canWriteDocuments(role: UserRole): boolean {
  return (
    role === UserRole.OWNER ||
    role === UserRole.ADMIN ||
    role === UserRole.MEMBER
  );
}

/** Delete invoices, estimates, or clients. */
export function canDeleteDocuments(role: UserRole): boolean {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

/** Reverse or delete recorded payments. */
export function canDeletePayments(role: UserRole): boolean {
  return role === UserRole.OWNER || role === UserRole.ADMIN;
}

/** Roles an actor may assign when inviting or updating a member. */
export function canAssignRole(actorRole: UserRole, newRole: UserRole): boolean {
  if (actorRole === UserRole.OWNER) {
    return (
      newRole === UserRole.ADMIN ||
      newRole === UserRole.MEMBER ||
      newRole === UserRole.VIEWER
    );
  }
  if (actorRole === UserRole.ADMIN) {
    return newRole === UserRole.MEMBER || newRole === UserRole.VIEWER;
  }
  return false;
}

/** Whether an actor may change or remove an existing member. */
export function canModifyMember(actorRole: UserRole, targetRole: UserRole): boolean {
  if (!canManageTeam(actorRole)) return false;
  if (actorRole === UserRole.OWNER) return true;
  return targetRole === UserRole.MEMBER || targetRole === UserRole.VIEWER;
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function inviteExpiresAt(from = new Date()): Date {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + INVITE_EXPIRY_DAYS);
  return expires;
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  OWNER:
    "Full control of the company, billing, and team. Can assign admin, member, or viewer roles and revoke any access except their own.",
  ADMIN:
    "Full access to company data, settings, and templates. Can invite and remove members and viewers.",
  MEMBER:
    "Create and manage invoices, estimates, and clients. Can send documents and record payments. Cannot delete documents or change company settings.",
  VIEWER:
    "Read-only access to invoices, estimates, and clients. Cannot create, edit, send, or delete.",
};
