"use client";

import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { PUBLIC_SECTION_LINKS } from "@/components/app-shell/app-sidebar-content";
import { PublicFeaturesNavItem } from "@/components/landing/public-nav-features";
import { PublicMobileNavSheet } from "@/components/public-mobile-nav-sheet";
import { PublicNavAuth } from "@/components/public-nav-auth";
import type { CompanySummary } from "@/lib/companies";
import { cn } from "@/lib/utils";

type PublicNavbarProps = {
  company?: (CompanySummary & { companies: CompanySummary[] }) | null;
};

function NavLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      {label}
    </Link>
  );
}

export function PublicNavbar({ company = null }: PublicNavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:hidden">
        <div className="flex min-w-0 items-center gap-1">
          <PublicMobileNavSheet company={company} />
          <Link href="/" className="min-w-0 truncate">
            <AppLogo className="text-base" />
          </Link>
        </div>
        <div className="shrink-0">
          <PublicNavAuth compact />
        </div>
      </div>

      <div className="mx-auto hidden h-[3.75rem] max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6 md:grid">
        <div className="flex items-center">
          <Link href="/" className="inline-flex">
            <AppLogo className="text-lg" />
          </Link>
        </div>

        <nav className="flex items-center justify-center gap-0.5">
          <PublicFeaturesNavItem />
          {PUBLIC_SECTION_LINKS.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} />
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          <PublicNavAuth />
        </div>
      </div>
    </header>
  );
}
