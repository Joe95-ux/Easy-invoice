import { PublicNavbar } from "@/components/public-navbar";
import { getCurrentMember, getUserMemberships } from "@/lib/auth";
import { membershipsToCompanySummaries } from "@/lib/companies";

export async function PublicNavbarLoader() {
  const member = await getCurrentMember();
  const memberships = member ? await getUserMemberships(member.clerkId) : [];

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
