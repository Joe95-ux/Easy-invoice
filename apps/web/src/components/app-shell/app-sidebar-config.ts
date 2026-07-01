import {
  ClipboardListIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  PlusIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/db";
import { canManageCompanySettings } from "@/lib/team";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const APP_QUICK_ACTIONS: AppNavItem[] = [
  { href: "/invoices/new", label: "New invoice", icon: PlusIcon },
  { href: "/estimates/new", label: "New estimate", icon: ClipboardListIcon },
  { href: "/clients/new", label: "Add client", icon: UserRoundIcon },
];

export const APP_WORKSPACE_ITEMS: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/invoices", label: "Invoices", icon: FileTextIcon },
  { href: "/estimates", label: "Estimates", icon: ClipboardListIcon },
  { href: "/templates", label: "Templates", icon: LayoutTemplateIcon },
  { href: "/clients", label: "Clients", icon: UsersRoundIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export const APP_QUICK_ACTION_PATHS = new Set(APP_QUICK_ACTIONS.map((item) => item.href));

export function isAppQuickActionActive(pathname: string, href: string) {
  return pathname === href;
}

export function isAppWorkspaceItemActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !APP_QUICK_ACTION_PATHS.has(pathname);
}

export function getAppWorkspaceItemsForRole(role: UserRole): AppNavItem[] {
  return APP_WORKSPACE_ITEMS.filter((item) => {
    if (item.href === "/settings" || item.href === "/templates") {
      return canManageCompanySettings(role);
    }
    return true;
  });
}
