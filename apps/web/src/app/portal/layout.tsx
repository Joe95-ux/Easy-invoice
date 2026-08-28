import Link from "next/link";
import type { ReactNode } from "react";
import { AppLogo } from "@/components/app-logo";
import { QrPublicThemeToggle } from "@/features/qr-codes/components/qr-public-theme-toggle";
import { PortalCompanySwitcher } from "@/features/portal/components/portal-company-switcher";
import { PortalSignOutButton } from "@/features/portal/components/portal-sign-out-button";
import { listPortalAccountsForSession } from "@/lib/portal/auth";
import { getPortalSession } from "@/lib/portal/session";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getPortalSession();
  const accounts = session ? await listPortalAccountsForSession(session) : [];

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
            <Link
              href={session ? "/portal" : "/portal/login"}
              className="min-w-0 shrink"
              aria-label="Invoice Desk client portal"
            >
              <AppLogo textClassName="truncate max-[380px]:hidden" />
            </Link>
            <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />
            <span className="hidden truncate text-sm font-medium text-muted-foreground sm:inline">
              Client portal
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {session ? <PortalCompanySwitcher accounts={accounts} /> : null}
            {session ? <PortalSignOutButton /> : null}
            <QrPublicThemeToggle iconOnly />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
