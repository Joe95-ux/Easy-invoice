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
import type { NavIconMotion } from "@/components/app-shell/nav-icon";

export type AppSubNavItem = {
  href: string;
  label: string;
};

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Per-icon hover motion (sidebar + page search). */
  motion: NavIconMotion;
  children?: AppSubNavItem[];
};

export const APP_QUICK_ACTIONS: AppNavItem[] = [
  { href: "/invoices/new", label: "New invoice", icon: PlusIcon, motion: "pulse" },
  { href: "/estimates/new", label: "New estimate", icon: ClipboardListIcon, motion: "lines" },
  { href: "/clients/new", label: "Add client", icon: UserRoundIcon, motion: "flip" },
];

export const APP_WORKSPACE_ITEMS: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon, motion: "tiles" },
  { href: "/invoices", label: "Invoices", icon: FileTextIcon, motion: "lines" },
  { href: "/recurring-invoices", label: "Recurring", icon: RefreshCwIcon, motion: "spin" },
  { href: "/estimates", label: "Estimates", icon: ClipboardListIcon, motion: "lines" },
  { href: "/projects", label: "Projects", icon: BriefcaseIcon, motion: "flip" },
  { href: "/templates", label: "Templates", icon: LayoutTemplateIcon, motion: "tiles" },
  { href: "/clients", label: "Clients", icon: UsersRoundIcon, motion: "flip" },
  { href: "/products", label: "Products", icon: PackageIcon, motion: "lift" },
  { href: "/time", label: "Time", icon: ClockIcon, motion: "tick" },
  { href: "/follow-ups", label: "Follow-ups", icon: CheckSquareIcon, motion: "check" },
  {
    href: "/qr-codes",
    label: "QR codes",
    icon: QrCodeIcon,
    motion: "scan",
    children: [
      { href: "/qr-codes/new", label: "Create QR code" },
      { href: "/qr-codes", label: "QR codes" },
    ],
  },
  { href: "/notifications", label: "Notifications", icon: BellIcon, motion: "swing" },
];

export const APP_TEAM_ITEMS: AppNavItem[] = [
  { href: "/members", label: "Members", icon: UsersRoundIcon, motion: "flip" },
  { href: "/settings/activity", label: "Activity log", icon: ScrollTextIcon, motion: "lines" },
  { href: "/analytics", label: "Analytics", icon: BarChart3Icon, motion: "bars" },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    motion: "gear",
    children: [
      { href: "/settings/general", label: "General" },
      { href: "/settings/custom-fields", label: "Custom fields" },
      { href: "/settings/tax", label: "Tax & currency" },
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
      return { href: item.href, label: item.label, icon: item.icon, motion: item.motion };
    }
    return { ...item, children };
  });
}

export function getAppTeamItemsForRole(role: UserRole): AppNavItem[] {
  if (!canManageCompanySettings(role)) return [];
  return APP_TEAM_ITEMS;
}

/** Flattened, role-filtered pages for the header Cmd/Ctrl+K search. */
export type AppPageSearchItem = {
  href: string;
  label: string;
  group: string;
  icon: LucideIcon;
  motion: NavIconMotion;
  keywords: string;
};

function flattenNavItems(
  items: AppNavItem[],
  group: string,
  childGroupByParent?: Record<string, string>,
): AppPageSearchItem[] {
  const out: AppPageSearchItem[] = [];
  for (const item of items) {
    if (item.children?.length) {
      const childGroup = childGroupByParent?.[item.href] ?? group;
      for (const child of item.children) {
        out.push({
          href: child.href,
          label: child.label,
          group: childGroup,
          icon: item.icon,
          motion: item.motion,
          keywords: `${item.label} ${child.label}`,
        });
      }
      continue;
    }
    out.push({
      href: item.href,
      label: item.label,
      group,
      icon: item.icon,
      motion: item.motion,
      keywords: item.label,
    });
  }
  return out;
}

export function getAppPageSearchItemsForRole(role: UserRole): AppPageSearchItem[] {
  const items: AppPageSearchItem[] = [
    ...flattenNavItems(getAppQuickActionsForRole(role), "Quick actions"),
    ...flattenNavItems(getAppWorkspaceItemsForRole(role), "Workspace"),
    ...flattenNavItems(getAppTeamItemsForRole(role), "Team", {
      "/settings": "Settings",
    }),
    {
      href: "/process",
      label: "Process",
      group: "Workspace",
      icon: CheckSquareIcon,
      motion: "check",
      keywords: "process workflow pipeline",
    },
  ];

  if (canManageCompanySettings(role)) {
    items.push(
      {
        href: "/settings/notifications",
        label: "Notification preferences",
        group: "Settings",
        icon: BellIcon,
        motion: "swing",
        keywords: "settings notifications preferences email",
      },
      {
        href: "/settings/billing/plans",
        label: "Plans",
        group: "Settings",
        icon: SettingsIcon,
        motion: "gear",
        keywords: "settings billing plans pricing upgrade",
      },
    );
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}
