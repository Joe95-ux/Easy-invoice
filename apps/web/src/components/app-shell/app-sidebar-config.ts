import {
  BarChart3Icon,
  BellIcon,
  ClipboardListIcon,
  ClockIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  PlusIcon,
  QrCodeIcon,
  ScrollTextIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/db";
import { canManageCompanySettings } from "@/lib/team";

export type AppSubNavItem = {
  href: string;
  label: string;
};

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: AppSubNavItem[];
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
  { href: "/time", label: "Time", icon: ClockIcon },
  {
    href: "/qr-codes",
    label: "QR codes",
    icon: QrCodeIcon,
    children: [
      { href: "/qr-codes/new", label: "Create QR code" },
      { href: "/qr-codes", label: "QR codes" },
    ],
  },
];

export const APP_TEAM_ITEMS: AppNavItem[] = [
  { href: "/members", label: "Members", icon: UsersRoundIcon },
  { href: "/settings/activity", label: "Activity log", icon: ScrollTextIcon },
  { href: "/analytics", label: "Analytics", icon: BarChart3Icon },
  { href: "/notifications", label: "Notifications", icon: BellIcon },
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

export function isAppTeamItemActive(pathname: string, href: string) {
  if (href === "/members") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === "/settings/activity") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === "/analytics") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === "/notifications") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === "/settings") {
    return pathname === "/settings";
  }
  return pathname === href;
}

export function getAppWorkspaceItemsForRole(role: UserRole): AppNavItem[] {
  return APP_WORKSPACE_ITEMS.filter((item) => {
    if (item.href === "/templates") {
      return canManageCompanySettings(role);
    }
    return true;
  });
}

export function getAppTeamItemsForRole(role: UserRole): AppNavItem[] {
  if (!canManageCompanySettings(role)) return [];
  return APP_TEAM_ITEMS;
}
