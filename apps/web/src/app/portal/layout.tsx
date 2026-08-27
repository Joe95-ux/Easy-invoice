import Link from "next/link";
import type { ReactNode } from "react";
import { AppLogo } from "@/components/app-logo";
import { QrPublicThemeToggle } from "@/features/qr-codes/components/qr-public-theme-toggle";
import { PortalSignOutButton } from "@/features/portal/components/portal-sign-out-button";
import { getPortalSession } from "@/lib/portal/session";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const session = await getPortalSession();

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={session ? "/portal" : "/portal/login"} className="flex items-center gap-2">
            <AppLogo />
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
              Client portal
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {session ? <PortalSignOutButton /> : null}
            <QrPublicThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
