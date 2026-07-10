"use client";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AppHeader } from "@/components/app-shell/app-header";
import { ActiveCompanySync } from "@/components/app-shell/active-company-sync";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
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
        <SidebarInset className="flex h-full min-h-0 flex-col overflow-hidden">
          <AppHeader memberId={memberId} />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </SidebarInset>
        <TimeTimerShell activeCompanyId={activeCompanyId} />
      </TimeTimerProvider>
    </SidebarProvider>
  );
}
