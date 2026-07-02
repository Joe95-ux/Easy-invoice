"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  SettingsIcon,
} from "lucide-react";
import type { CompanySummary } from "@/lib/companies";
import { getCompanyInitials } from "@/lib/companies";
import { logoPreviewClassName, normalizeLogoBg, type LogoBg } from "@/lib/company-branding";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type SidebarOrgHeaderProps = {
  activeCompanyId: string;
  companies: CompanySummary[];
  companyName: string;
  logoUrl: string | null;
  logoBg?: LogoBg;
  showCompanySettings?: boolean;
};

function CompanyMark({
  companyName,
  logoUrl,
  logoBg = "white",
  className,
}: {
  companyName: string;
  logoUrl: string | null;
  logoBg?: LogoBg;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn(
          "size-8 shrink-0 rounded-md object-contain p-0.5 ring-1 ring-black/10 dark:ring-white/15",
          logoPreviewClassName(normalizeLogoBg(logoBg)),
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary",
        className,
      )}
    >
      {getCompanyInitials(companyName)}
    </div>
  );
}

export function SidebarOrgHeader({
  activeCompanyId,
  companies,
  companyName,
  logoUrl,
  logoBg = "white",
  showCompanySettings = true,
}: SidebarOrgHeaderProps) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  async function handleSwitch(companyId: string) {
    if (companyId === activeCompanyId || switching) return;

    const targetCompany = companies.find((company) => company.id === companyId);
    const toastId = toast.loading(
      `Switching to ${targetCompany?.name ?? "company"}…`,
    );

    setSwitching(true);
    try {
      const response = await fetch("/api/companies/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      if (!response.ok) {
        throw new Error("Failed to switch company");
      }

      router.refresh();
      toast.dismiss(toastId);
    } catch {
      toast.error("Could not switch company. Please try again.", { id: toastId });
    } finally {
      setSwitching(false);
    }
  }

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className={cn(
                  "cursor-pointer hover:bg-sidebar-accent/60",
                  "group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!h-8 group-data-[collapsible=icon]:!min-h-8",
                  "group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0",
                )}
                tooltip={companyName}
                disabled={switching}
              />
            }
          >
            <CompanyMark
              companyName={companyName}
              logoUrl={logoUrl}
              logoBg={logoBg}
              className="group-data-[collapsible=icon]:mx-auto"
            />
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-heading font-semibold">{companyName}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">
                Invoice Desk
              </span>
            </div>
            <ChevronDownIcon className="ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom" className="min-w-56">
            {companies.map((company) => {
              const isActive = company.id === activeCompanyId;

              return (
                <DropdownMenuItem
                  key={company.id}
                  disabled={switching}
                  onClick={() => handleSwitch(company.id)}
                >
                  <CompanyMark
                    companyName={company.name}
                    logoUrl={company.logoUrl}
                    logoBg={company.logoBg}
                    className="size-6 text-[10px]"
                  />
                  <span className="truncate">{company.name}</span>
                  {isActive && <CheckIcon className="ml-auto size-4" />}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/companies/new" />}>
              <PlusIcon className="size-4" />
              Create company
            </DropdownMenuItem>
            {showCompanySettings && (
              <DropdownMenuItem render={<Link href="/settings" />}>
                <SettingsIcon className="size-4" />
                Company settings
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
