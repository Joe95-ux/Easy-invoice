"use client";

import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { PUBLIC_SECTION_LINKS } from "@/components/app-shell/app-sidebar-content";
import { PublicMobileNavSheet } from "@/components/public-mobile-nav-sheet";
import { PublicNavAuth } from "@/components/public-nav-auth";
import { cn } from "@/lib/utils";

type PublicNavbarProps = {
  company?: {
    name: string;
    logoUrl: string | null;
    plan: string;
  } | null;
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
      <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-[3.75rem] md:px-6">
        <div className="flex w-10 shrink-0 items-center md:hidden">
          <PublicMobileNavSheet company={company} />
        </div>

        <Link
          href="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0"
        >
          <AppLogo className="text-lg" />
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex md:flex-1 md:pl-6">
          {PUBLIC_SECTION_LINKS.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} />
          ))}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2">
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
