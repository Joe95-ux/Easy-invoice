import { PublicNavbar } from "@/components/public-navbar";
import { getCurrentMember, getUserMemberships } from "@/lib/auth";
import { membershipsToCompanySummaries } from "@/lib/companies";

export async function PublicNavbarLoader() {
  let member = null;
  let memberships: Awaited<ReturnType<typeof getUserMemberships>> = [];
  try {
    member = await getCurrentMember();
    memberships = member ? await getUserMemberships(member.clerkId) : [];
  } catch {
    // Public pages should still render if the database is down.
  }

  return (
    <PublicNavbar
      company={
        member
          ? {
              id: member.company.id,
              name: member.company.name,
              logoUrl: member.company.logoUrl,
              plan: member.company.plan,
              companies: membershipsToCompanySummaries(memberships),
            }
          : null
      }
    />
  );
}
