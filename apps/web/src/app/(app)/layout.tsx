import { redirect } from "next/navigation";
import { getCurrentMember, getUserMemberships } from "@/lib/auth";
import { membershipsToCompanySummaries } from "@/lib/companies";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const memberships = await getUserMemberships(member.clerkId);
  const { company } = member;

  return (
    <AppShell
      activeCompanyId={company.id}
      companies={membershipsToCompanySummaries(memberships)}
      companyName={company.name}
      logoUrl={company.logoUrl}
      plan={company.plan}
    >
      {children}
    </AppShell>
  );
}
