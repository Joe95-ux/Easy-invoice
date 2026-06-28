"use client";

import { AppSidebarContent } from "@/components/app-shell/app-sidebar-content";
import { Sidebar, SidebarRail } from "@/components/ui/sidebar";

type AppSidebarProps = {
  companyName: string;
  logoUrl: string | null;
  plan: string;
};

export function AppSidebar({ companyName, logoUrl, plan }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <AppSidebarContent
        companyName={companyName}
        logoUrl={logoUrl}
        plan={plan}
      />
      <SidebarRail />
    </Sidebar>
  );
}
