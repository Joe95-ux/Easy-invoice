import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const { company } = member;

  return (
    <AppShell
      companyName={company.name}
      logoUrl={company.logoUrl}
      plan={company.plan}
    >
      {children}
    </AppShell>
  );
}
