"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRightIcon,
  HelpCircleIcon,
  SparklesIcon,
  WalletIcon,
  WorkflowIcon,
} from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import {
  APP_QUICK_ACTIONS,
  getAppTeamItemsForRole,
  getAppWorkspaceItemsForRole,
  isAppQuickActionActive,
  isAppTeamItemActive,
  isAppWorkspaceItemActive,
  type AppNavItem,
} from "@/components/app-shell/app-sidebar-config";
import { SidebarFooterPanel } from "@/components/app-shell/sidebar-footer-panel";
import { SidebarOrgHeader } from "@/components/app-shell/sidebar-org-header";
import type { CompanySummary } from "@/lib/companies";
import type { LogoBg } from "@/lib/company-branding";
import type { UserRole } from "@/lib/db";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export const PUBLIC_SECTION_LINKS = [
  { href: "#features", label: "Features", icon: SparklesIcon },
  { href: "#how", label: "How it works", icon: WorkflowIcon },
  { href: "#pricing", label: "Pricing", icon: WalletIcon },
  { href: "#faq", label: "FAQ", icon: HelpCircleIcon },
] as const;

type AppSidebarContentProps = {
  activeCompanyId?: string;
  companies?: CompanySummary[];
  companyName?: string;
  logoUrl?: string | null;
  logoBg?: LogoBg;
  plan?: string;
  userRole?: UserRole;
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
      {items.map((item) =>
        item.children && item.children.length > 0 ? (
          <NavCollapsibleItem
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            onNavigate={onNavigate}
          />
        ) : (
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
        ),
      )}
    </SidebarMenu>
  );
}

function NavCollapsibleItem({
  item,
  isActive,
  onNavigate,
}: {
  item: AppNavItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const children = useMemo(() => item.children ?? [], [item.children]);

  const activeChildHref = useMemo(() => {
    let best: string | null = null;
    for (const child of children) {
      if (pathname === child.href || pathname.startsWith(`${child.href}/`)) {
        if (!best || child.href.length > best.length) best = child.href;
      }
    }
    return best;
  }, [children, pathname]);

  const [open, setOpen] = useState(() => activeChildHref !== null);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton tooltip={item.label} isActive={isActive} />
          }
        >
          <item.icon />
          <span>{item.label}</span>
          <ChevronRightIcon
            className={cn(
              "ml-auto transition-transform duration-200",
              open && "rotate-90",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {children.map((child) => (
              <SidebarMenuSubItem key={`${child.href}-${child.label}`}>
                <SidebarMenuSubButton
                  isActive={activeChildHref === child.href}
                  render={<Link href={child.href} onClick={onNavigate} />}
                >
                  <span>{child.label}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebarContent({
  activeCompanyId,
  companies = [],
  companyName,
  logoUrl = null,
  logoBg = "white",
  plan = "FREE",
  userRole = "MEMBER",
  onNavigate,
  showPublicSections = false,
}: AppSidebarContentProps) {
  const pathname = usePathname();
  const hasCompany = Boolean(companyName && activeCompanyId);
  const workspaceItems = getAppWorkspaceItemsForRole(userRole);
  const teamItems = getAppTeamItemsForRole(userRole);

  return (
    <>
      <SidebarHeader
        className={
          hasCompany
            ? "group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
            : undefined
        }
      >
        {hasCompany ? (
          <SidebarOrgHeader
            activeCompanyId={activeCompanyId!}
            companies={companies}
            companyName={companyName!}
            logoUrl={logoUrl}
            logoBg={logoBg}
            showCompanySettings={userRole === "OWNER" || userRole === "ADMIN"}
          />
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
              items={workspaceItems}
              isActive={(href) => isAppWorkspaceItemActive(pathname, href)}
              onNavigate={onNavigate}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {teamItems.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Team</SidebarGroupLabel>
              <SidebarGroupContent>
                <NavMenu
                  items={teamItems}
                  isActive={(href) => isAppTeamItemActive(pathname, href)}
                  onNavigate={onNavigate}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

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
