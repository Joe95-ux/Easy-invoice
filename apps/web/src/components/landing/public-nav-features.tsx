"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  ArrowRightIcon,
  BellRingIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  CreditCardIcon,
  FileTextIcon,
  QrCodeIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type PublicFeatureLink = {
  title: string;
  description: string;
  hrefGuest: string;
  hrefSignedIn: string;
  icon: LucideIcon;
};

export type PublicFeatureColumn = {
  heading: string;
  items: PublicFeatureLink[];
};

export type PublicFeatureCta = {
  title: string;
  description: string;
  href: string;
  primary?: boolean;
};

/** Core product columns for the Features mega menu (Linear-style). */
export const PUBLIC_FEATURE_COLUMNS: PublicFeatureColumn[] = [
  {
    heading: "Create",
    items: [
      {
        title: "AI draft",
        description: "Notes become an itemized invoice",
        hrefGuest: "/#features",
        hrefSignedIn: "/invoices/new",
        icon: SparklesIcon,
      },
      {
        title: "Invoices",
        description: "Send, track, and get paid",
        hrefGuest: "/#how",
        hrefSignedIn: "/invoices",
        icon: FileTextIcon,
      },
      {
        title: "Estimates",
        description: "Quotes clients can e-sign",
        hrefGuest: "/#how",
        hrefSignedIn: "/estimates",
        icon: ClipboardListIcon,
      },
    ],
  },
  {
    heading: "Collect & share",
    items: [
      {
        title: "Card checkout",
        description: "Stripe Connect — paid to you",
        hrefGuest: "/#pricing",
        hrefSignedIn: "/settings/billing",
        icon: CreditCardIcon,
      },
      {
        title: "Reminders",
        description: "Automatic follow-ups on due dates",
        hrefGuest: "/#how",
        hrefSignedIn: "/settings/general",
        icon: BellRingIcon,
      },
      {
        title: "QR codes",
        description: "Print once, change anytime",
        hrefGuest: "/#qr",
        hrefSignedIn: "/qr-codes",
        icon: QrCodeIcon,
      },
    ],
  },
];

const GUEST_CTAS: PublicFeatureCta[] = [
  {
    title: "Start for free",
    description: "No credit card required",
    href: "/sign-up",
    primary: true,
  },
  {
    title: "See how it works",
    description: "Job site to paid in three moves",
    href: "/#how",
  },
  {
    title: "View pricing",
    description: "Free forever · Pro when you scale",
    href: "/#pricing",
  },
];

const SIGNED_IN_CTAS: PublicFeatureCta[] = [
  {
    title: "Open dashboard",
    description: "Pick up where you left off",
    href: "/dashboard",
    primary: true,
  },
  {
    title: "New invoice",
    description: "Draft from notes or a form",
    href: "/invoices/new",
  },
  {
    title: "Create QR code",
    description: "Wi‑Fi, menus, pay links, and more",
    href: "/qr-codes/new",
  },
];

function FeatureItem({
  item,
  onNavigate,
  compact,
}: {
  item: PublicFeatureLink;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const { isSignedIn } = useAuth();
  const href = isSignedIn ? item.hrefSignedIn : item.hrefGuest;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex gap-3 rounded-lg p-2.5 transition-colors",
        compact
          ? "px-2 py-2 hover:bg-sidebar-accent"
          : "hover:bg-muted",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border/60 group-hover:text-foreground">
        <item.icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{item.title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
          {item.description}
        </span>
      </span>
    </Link>
  );
}

function CtaList({
  onNavigate,
  compact,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const { isSignedIn } = useAuth();
  const ctas = isSignedIn ? SIGNED_IN_CTAS : GUEST_CTAS;

  return (
    <>
      {ctas.map((cta) => (
        <Link
          key={cta.href}
          href={cta.href}
          onClick={onNavigate}
          className={cn(
            "group flex items-start justify-between gap-2 rounded-lg p-2.5 transition-colors",
            compact ? "px-2 py-2 hover:bg-sidebar-accent" : "hover:bg-background/80",
            cta.primary &&
              (compact
                ? "bg-sidebar ring-1 ring-sidebar-border"
                : "bg-background/60 ring-1 ring-border/70"),
          )}
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">{cta.title}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {cta.description}
            </span>
          </span>
          {cta.primary ? (
            <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
          ) : null}
        </Link>
      ))}
    </>
  );
}

/** Shared column layout — desktop mega panel and mobile sheet. */
export function PublicFeaturesPanel({
  onNavigate,
  className,
  compact = false,
}: {
  onNavigate?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const { isSignedIn } = useAuth();

  return (
    <div
      className={cn(
        "grid overflow-hidden",
        compact
          ? "grid-cols-1 divide-y divide-sidebar-border rounded-lg bg-sidebar-accent/25 text-sidebar-foreground"
          : "w-[min(92vw,40rem)] grid-cols-1 divide-y divide-border rounded-xl bg-popover text-popover-foreground sm:grid-cols-3 sm:divide-x sm:divide-y-0",
        className,
      )}
    >
      {PUBLIC_FEATURE_COLUMNS.map((column) => (
        <div key={column.heading} className={cn("p-3", compact && "px-1 py-2")}>
          <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {column.heading}
          </p>
          <ul className="space-y-0.5">
            {column.items.map((item) => (
              <li key={item.title}>
                <FeatureItem item={item} onNavigate={onNavigate} compact={compact} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div
        className={cn(
          "p-3",
          compact ? "bg-sidebar-accent/40 px-1 py-2" : "bg-muted/40",
        )}
      >
        <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {isSignedIn ? "Quick actions" : "Get started"}
        </p>
        <div className="space-y-0.5">
          <CtaList onNavigate={onNavigate} compact={compact} />
        </div>
      </div>
    </div>
  );
}

/** Mobile / sheet: collapsible Features with stacked columns. */
export function PublicFeaturesMobileNav({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger render={<SidebarMenuButton tooltip="Features" />}>
          <SparklesIcon />
          <span>Features</span>
          <ChevronRightIcon
            className={cn(
              "ml-auto transition-transform duration-200",
              open && "rotate-90",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-1 px-1 pb-2">
            <PublicFeaturesPanel compact onNavigate={onNavigate} />
          </div>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/** Desktop Features trigger + Linear-style column dropdown. */
export function PublicFeaturesNavItem() {
  return (
    <NavigationMenu align="center" className="max-w-none">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="h-auto bg-transparent px-3 py-2 text-sm font-normal text-muted-foreground hover:bg-muted hover:text-foreground data-open:bg-muted data-open:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground">
            Features
          </NavigationMenuTrigger>
          <NavigationMenuContent className="p-0 md:w-auto">
            <PublicFeaturesPanel />
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
