"use client";

import {
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-shell/app-header";
import { ActiveCompanySync } from "@/components/app-shell/active-company-sync";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { AppWorkspaceFooter } from "@/components/app-shell/app-workspace-footer";
import { CompanyPlanProvider } from "@/components/billing/company-plan-context";
import { TimeTimerProvider } from "@/features/time/components/time-timer-provider";
import { TimeTimerShell } from "@/features/time/components/time-timer-shell";
import type { CompanySummary } from "@/lib/companies";
import type { LogoBg } from "@/lib/company-branding";
import type { UserRole } from "@/lib/db";
import { cn } from "@/lib/utils";

type AppShellProps = {
  activeCompanyId: string;
  memberId: string;
  companies: CompanySummary[];
  companyName: string;
  logoUrl: string | null;
  logoBg?: LogoBg;
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
  maxWidth?: "6xl" | "4xl" | "85rem" | "50rem" | "60rem";
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
      <div
        className={cn(
          "mx-auto w-full p-4 md:p-6",
          !fullWidth &&
            (maxWidth === "4xl"
              ? "max-w-4xl"
              : maxWidth === "85rem"
                ? "max-w-[85rem]"
                : maxWidth === "50rem"
                  ? "max-w-[50rem]"
                  : maxWidth === "60rem"
                    ? "max-w-[60rem]"
                    : "max-w-6xl"),
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
  memberId,
  companies,
  companyName,
  logoUrl,
  logoBg = "white",
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
      <TimeTimerProvider activeCompanyId={activeCompanyId}>
        <CompanyPlanProvider plan={plan}>
        <ActiveCompanySync />
        <AppSidebar
          activeCompanyId={activeCompanyId}
          companies={companies}
          companyName={companyName}
          logoUrl={logoUrl}
          logoBg={logoBg}
          plan={plan}
          userRole={userRole}
        />
        <div
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            "md:mt-2 md:mr-2 md:peer-data-[state=collapsed]:ml-2",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-xl md:shadow-sm">
            <AppHeader memberId={memberId} />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {children}
            </div>
          </div>
          <AppWorkspaceFooter />
        </div>
        <TimeTimerShell activeCompanyId={activeCompanyId} />
        </CompanyPlanProvider>
      </TimeTimerProvider>
    </SidebarProvider>
  );
}
