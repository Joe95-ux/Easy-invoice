import {
  BarChart3Icon,
  BellIcon,
  BriefcaseIcon,
  CheckSquareIcon,
  ClipboardListIcon,
  ClockIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  PackageIcon,
  PlusIcon,
  QrCodeIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/db";
import { canManageCompanySettings, canWriteDocuments } from "@/lib/team";

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
  { href: "/recurring-invoices", label: "Recurring", icon: RefreshCwIcon },
  { href: "/estimates", label: "Estimates", icon: ClipboardListIcon },
  { href: "/projects", label: "Projects", icon: BriefcaseIcon },
  { href: "/templates", label: "Templates", icon: LayoutTemplateIcon },
  { href: "/clients", label: "Clients", icon: UsersRoundIcon },
  { href: "/products", label: "Products", icon: PackageIcon },
  { href: "/time", label: "Time", icon: ClockIcon },
  { href: "/follow-ups", label: "Follow-ups", icon: CheckSquareIcon },
  {
    href: "/qr-codes",
    label: "QR codes",
    icon: QrCodeIcon,
    children: [
      { href: "/qr-codes/new", label: "Create QR code" },
      { href: "/qr-codes", label: "QR codes" },
    ],
  },
  { href: "/notifications", label: "Notifications", icon: BellIcon },
];

export const APP_TEAM_ITEMS: AppNavItem[] = [
  { href: "/members", label: "Members", icon: UsersRoundIcon },
  { href: "/settings/activity", label: "Activity log", icon: ScrollTextIcon },
  { href: "/analytics", label: "Analytics", icon: BarChart3Icon },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    children: [
      { href: "/settings/general", label: "General" },
      { href: "/settings/custom-fields", label: "Custom fields" },
      { href: "/settings/tax", label: "Tax rates" },
      { href: "/settings/form-templates", label: "Form templates" },
      { href: "/settings/billing", label: "Billing" },
    ],
  },
];

export const APP_QUICK_ACTION_PATHS = new Set(APP_QUICK_ACTIONS.map((item) => item.href));

export function canShowQuickActions(role: UserRole): boolean {
  return canWriteDocuments(role);
}

export function getAppQuickActionsForRole(role: UserRole): AppNavItem[] {
  return canShowQuickActions(role) ? APP_QUICK_ACTIONS : [];
}

export function isAppQuickActionActive(pathname: string, href: string) {
  return pathname === href;
}

export function isAppWorkspaceItemActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  if (href === "/notifications") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !APP_QUICK_ACTION_PATHS.has(pathname);
}

const SETTINGS_SECTION_PATHS = [
  "/settings/general",
  "/settings/custom-fields",
  "/settings/tax",
  "/settings/form-templates",
  "/settings/billing",
] as const;

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
  if (href === "/settings") {
    return SETTINGS_SECTION_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  }
  return pathname === href;
}

export function getAppWorkspaceItemsForRole(role: UserRole): AppNavItem[] {
  const canWrite = canWriteDocuments(role);
  return APP_WORKSPACE_ITEMS.filter((item) => {
    if (item.href === "/templates") {
      return canManageCompanySettings(role);
    }
    return true;
  }).map((item) => {
    if (!item.children || canWrite) return item;
    const children = item.children.filter(
      (child) => !child.href.endsWith("/new") && !child.label.toLowerCase().startsWith("create"),
    );
    if (children.length === 0) {
      return { href: item.href, label: item.label, icon: item.icon };
    }
    return { ...item, children };
  });
}

export function getAppTeamItemsForRole(role: UserRole): AppNavItem[] {
  if (!canManageCompanySettings(role)) return [];
  return APP_TEAM_ITEMS;
}
