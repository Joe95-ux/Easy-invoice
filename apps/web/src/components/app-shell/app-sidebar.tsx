"use client";

import { AppSidebarContent } from "@/components/app-shell/app-sidebar-content";
import { Sidebar, SidebarRail } from "@/components/ui/sidebar";
import type { CompanySummary } from "@/lib/companies";

type AppSidebarProps = {
  activeCompanyId: string;
  companies: CompanySummary[];
  companyName: string;
  logoUrl: string | null;
  plan: string;
};

export function AppSidebar({
  activeCompanyId,
  companies,
  companyName,
  logoUrl,
  plan,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <AppSidebarContent
        activeCompanyId={activeCompanyId}
        companies={companies}
        companyName={companyName}
        logoUrl={logoUrl}
        plan={plan}
      />
      <SidebarRail />
    </Sidebar>
  );
}
