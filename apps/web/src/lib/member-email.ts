import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

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

type MemberRow = {
  id: string;
  clerkId: string;
  email: string;
};

/** Returns login email from Clerk; syncs DB when stored value is stale. */
export async function resolveMemberLoginEmail(member: MemberRow): Promise<string> {
  const loginEmail = await getClerkLoginEmail(member.clerkId);
  if (!loginEmail) return member.email;

  if (loginEmail.toLowerCase() !== member.email.toLowerCase()) {
    void prisma.companyMember
      .update({ where: { id: member.id }, data: { email: loginEmail } })
      .catch(() => undefined);
  }

  return loginEmail;
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
