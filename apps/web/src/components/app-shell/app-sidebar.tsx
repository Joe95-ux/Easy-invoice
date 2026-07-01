"use client";

import { AppSidebarContent } from "@/components/app-shell/app-sidebar-content";
import { Sidebar, SidebarRail } from "@/components/ui/sidebar";
import type { CompanySummary } from "@/lib/companies";
import type { UserRole } from "@/lib/db";

type AppSidebarProps = {
  activeCompanyId: string;
  companies: CompanySummary[];
  companyName: string;
  logoUrl: string | null;
  plan: string;
  userRole: UserRole;
};

export function AppSidebar({
  activeCompanyId,
  companies,
  companyName,
  logoUrl,
  plan,
  userRole,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <AppSidebarContent
        activeCompanyId={activeCompanyId}
        companies={companies}
        companyName={companyName}
        logoUrl={logoUrl}
        plan={plan}
        userRole={userRole}
      />
      <SidebarRail />
    </Sidebar>
  );
}
