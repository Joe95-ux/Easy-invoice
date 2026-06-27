"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardListIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  PlusIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarFooterPanel } from "@/components/app-shell/sidebar-footer-panel";
import { SidebarOrgHeader } from "@/components/app-shell/sidebar-org-header";

type AppSidebarProps = {
  companyName: string;
  logoUrl: string | null;
  plan: string;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/invoices", label: "Invoices", icon: FileTextIcon },
  { href: "/estimates", label: "Estimates", icon: ClipboardListIcon },
  { href: "/clients", label: "Clients", icon: UsersRoundIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const quickActions = [
  { href: "/invoices/new", label: "New invoice", icon: PlusIcon },
  { href: "/estimates/new", label: "New estimate", icon: ClipboardListIcon },
  { href: "/clients/new", label: "Add client", icon: UserRoundIcon },
];

export function AppSidebar({ companyName, logoUrl, plan }: AppSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarOrgHeader companyName={companyName} logoUrl={logoUrl} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickActions.map((action) => (
                <SidebarMenuItem key={action.href}>
                  <SidebarMenuButton
                    tooltip={action.label}
                    isActive={isActive(action.href)}
                    render={<Link href={action.href} />}
                  >
                    <action.icon />
                    <span>{action.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={isActive(item.href)}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarFooterPanel plan={plan} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
