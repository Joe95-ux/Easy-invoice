"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircleIcon, SparklesIcon, WalletIcon, WorkflowIcon } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import {
  APP_QUICK_ACTIONS,
  APP_WORKSPACE_ITEMS,
  isAppQuickActionActive,
  isAppWorkspaceItemActive,
  type AppNavItem,
} from "@/components/app-shell/app-sidebar-config";
import { SidebarFooterPanel } from "@/components/app-shell/sidebar-footer-panel";
import { SidebarOrgHeader } from "@/components/app-shell/sidebar-org-header";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export const PUBLIC_SECTION_LINKS = [
  { href: "#features", label: "Features", icon: SparklesIcon },
  { href: "#how", label: "How it works", icon: WorkflowIcon },
  { href: "#pricing", label: "Pricing", icon: WalletIcon },
  { href: "#faq", label: "FAQ", icon: HelpCircleIcon },
] as const;

type AppSidebarContentProps = {
  companyName?: string;
  logoUrl?: string | null;
  plan?: string;
  onNavigate?: () => void;
  showPublicSections?: boolean;
};

function NavMenu({
  items,
  isActive,
  onNavigate,
}: {
  items: AppNavItem[];
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            tooltip={item.label}
            isActive={isActive(item.href)}
            render={<Link href={item.href} onClick={onNavigate} />}
          >
            <item.icon />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppSidebarContent({
  companyName,
  logoUrl = null,
  plan = "FREE",
  onNavigate,
  showPublicSections = false,
}: AppSidebarContentProps) {
  const pathname = usePathname();
  const hasCompany = Boolean(companyName);

  return (
    <>
      <SidebarHeader>
        {hasCompany ? (
          <SidebarOrgHeader companyName={companyName!} logoUrl={logoUrl} />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link href="/" onClick={onNavigate} />}
              >
                <AppLogo iconClassName="size-8" showText={false} />
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-heading font-semibold">Invoice Desk</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Simple invoicing
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavMenu
              items={APP_QUICK_ACTIONS}
              isActive={(href) => isAppQuickActionActive(pathname, href)}
              onNavigate={onNavigate}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMenu
              items={APP_WORKSPACE_ITEMS}
              isActive={(href) => isAppWorkspaceItemActive(pathname, href)}
              onNavigate={onNavigate}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {showPublicSections && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Website</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {PUBLIC_SECTION_LINKS.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        tooltip={item.label}
                        render={<Link href={item.href} onClick={onNavigate} />}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {hasCompany && (
        <SidebarFooter>
          <SidebarFooterPanel plan={plan} />
        </SidebarFooter>
      )}
    </>
  );
}
