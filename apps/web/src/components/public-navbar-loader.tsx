import { PublicNavbar } from "@/components/public-navbar";
import { getCurrentMember } from "@/lib/auth";

export async function PublicNavbarLoader() {
  const member = await getCurrentMember();

  return (
    <PublicNavbar
      company={
        member
          ? {
              name: member.company.name,
              logoUrl: member.company.logoUrl,
              plan: member.company.plan,
            }
          : null
      }
    />
  );
}
