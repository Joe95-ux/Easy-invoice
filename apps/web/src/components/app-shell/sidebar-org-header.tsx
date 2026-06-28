"use client";

import { useRef } from "react";
import { OrganizationSwitcher } from "@clerk/nextjs";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type SidebarOrgHeaderProps = {
  companyName: string;
  logoUrl: string | null;
};

function CompanyMark({
  companyName,
  logoUrl,
}: {
  companyName: string;
  logoUrl: string | null;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="size-8 shrink-0 rounded-md object-contain"
      />
    );
  }

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary">
      {companyName.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function SidebarOrgHeader({ companyName, logoUrl }: SidebarOrgHeaderProps) {
  const switcherRef = useRef<HTMLDivElement>(null);

  function openOrganizationSwitcher() {
    const trigger = switcherRef.current?.querySelector<HTMLElement>(
      ".cl-organizationSwitcherTrigger, [data-clerk-element='organizationSwitcherTrigger']",
    );
    trigger?.click();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem className="relative">
        <SidebarMenuButton
          size="lg"
          type="button"
          className={cn(
            "hover:bg-sidebar-accent/60",
            logoUrl && "group-data-[collapsible=icon]:!p-1.5",
          )}
          tooltip={companyName}
          onClick={openOrganizationSwitcher}
        >
          <CompanyMark companyName={companyName} logoUrl={logoUrl} />
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-heading font-semibold">{companyName}</span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              Invoice Desk
            </span>
          </div>
        </SidebarMenuButton>
        <div
          ref={switcherRef}
          className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
          aria-hidden
        >
          <OrganizationSwitcher hidePersonal organizationProfileMode="modal" />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
