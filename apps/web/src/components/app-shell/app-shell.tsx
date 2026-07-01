"use client";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-shell/app-header";
import { ActiveCompanySync } from "@/components/app-shell/active-company-sync";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import type { CompanySummary } from "@/lib/companies";
import type { UserRole } from "@/lib/db";
import { cn } from "@/lib/utils";

type AppShellProps = {
  activeCompanyId: string;
  companies: CompanySummary[];
  companyName: string;
  logoUrl: string | null;
  plan: string;
  userRole: UserRole;
  children: React.ReactNode;
};

export function PageScroll({
  children,
  className,
  fullWidth = false,
  maxWidth = "6xl",
}: {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  maxWidth?: "6xl" | "4xl";
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
      <div
        className={cn(
          "mx-auto w-full p-4 md:p-6",
          !fullWidth && (maxWidth === "4xl" ? "max-w-4xl" : "max-w-6xl"),
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function AppShell({
  activeCompanyId,
  companies,
  companyName,
  logoUrl,
  plan,
  userRole,
  children,
}: AppShellProps) {
  return (
    <SidebarProvider
      defaultOpen
      data-app-shell
      className="h-svh overflow-hidden"
    >
      <ActiveCompanySync />
      <AppSidebar
        activeCompanyId={activeCompanyId}
        companies={companies}
        companyName={companyName}
        logoUrl={logoUrl}
        plan={plan}
        userRole={userRole}
      />
      <SidebarInset className="flex h-full min-h-0 flex-col overflow-hidden">
        <AppHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
