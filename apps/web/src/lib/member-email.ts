import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

type MemberRow = {
  id: string;
  clerkId: string;
  email: string;
};

type MemberProfileRow = MemberRow & {
  name?: string | null;
};

function displayNameFromClerkUser(user: {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
}): string | null {
  const fullName = user.fullName?.trim();
  if (fullName) return fullName;
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export async function getClerkLoginEmail(clerkId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkId);
    return (
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null
    );
  } catch {
    return null;
  }
}

export async function getClerkDisplayName(clerkId: string): Promise<string | null> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkId);
    return displayNameFromClerkUser(user);
  } catch {
    return null;
  }
}

/** Returns login email and display name from Clerk; syncs DB when stale. */
export async function resolveMemberProfile(
  member: MemberProfileRow,
): Promise<{ email: string; name: string | null }> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(member.clerkId);
    const loginEmail =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      member.email;
    const displayName = displayNameFromClerkUser(user);

    const updates: { email?: string; name?: string | null } = {};
    if (loginEmail.toLowerCase() !== member.email.toLowerCase()) {
      updates.email = loginEmail;
    }
    if (displayName && displayName !== member.name) {
      updates.name = displayName;
    }
    if (Object.keys(updates).length > 0) {
      void prisma.companyMember
        .update({ where: { id: member.id }, data: updates })
        .catch(() => undefined);
    }

    return {
      email: loginEmail,
      name: displayName ?? member.name ?? null,
    };
  } catch {
    return { email: member.email, name: member.name ?? null };
  }
}

/** Returns login email from Clerk; syncs DB when stored value is stale. */
export async function resolveMemberLoginEmail(member: MemberRow): Promise<string> {
  const profile = await resolveMemberProfile(member);
  return profile.email;
}

export async function resolveMemberLoginEmails<T extends MemberRow>(
  members: T[],
): Promise<Array<T & { email: string }>> {
  return Promise.all(
    members.map(async (member) => ({
      ...member,
      email: await resolveMemberLoginEmail(member),
    })),
  );
}

export async function resolveMemberProfiles<T extends MemberProfileRow>(
  members: T[],
): Promise<Array<T & { email: string; name: string | null }>> {
  return Promise.all(
    members.map(async (member) => ({
      ...member,
      ...(await resolveMemberProfile(member)),
    })),
  );
}

export function formatRevisionActor(name: string | null, email: string | null): string | null {
  if (name?.trim()) return name.trim();
  if (email) return email;
  return null;
}
