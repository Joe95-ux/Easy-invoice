"use client";

import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { PUBLIC_SECTION_LINKS } from "@/components/app-shell/app-sidebar-content";
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
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 md:h-[3.75rem] md:px-6">
        <div className="flex items-center">
          <div className="md:hidden">
            <PublicMobileNavSheet company={company} />
          </div>
          <Link href="/" className="hidden md:inline-flex">
            <AppLogo className="text-lg" />
          </Link>
        </div>

        <div className="flex justify-center">
          <Link href="/" className="md:hidden">
            <AppLogo className="text-lg" />
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex">
            {PUBLIC_SECTION_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}
          </nav>
        </div>

        <div className="flex items-center justify-end gap-2">
          <div className="md:hidden">
            <PublicNavAuth compact />
          </div>
          <div className="hidden md:flex md:items-center md:gap-2">
            <PublicNavAuth />
          </div>
        </div>
      </div>
    </header>
  );
}
