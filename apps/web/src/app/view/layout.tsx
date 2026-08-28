import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { QrPublicThemeToggle } from "@/features/qr-codes/components/qr-public-theme-toggle";
import { getPortalSession } from "@/lib/portal/session";

export default async function PublicViewLayout({ children }: { children: ReactNode }) {
  const portalSession = await getPortalSession();

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href={portalSession ? "/portal" : "/"}
              className="min-w-0 shrink"
              aria-label={portalSession ? "Back to client portal" : "Invoice Desk home"}
            >
              <AppLogo textClassName="truncate max-[380px]:hidden" />
            </Link>
            {portalSession ? (
              <>
                <span className="hidden h-4 w-px shrink-0 bg-border sm:block" aria-hidden />
                <Link
                  href="/portal"
                  className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeftIcon className="size-3.5 shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Portal</span>
                    <span className="hidden sm:inline">Back to portal</span>
                  </span>
                </Link>
              </>
            ) : null}
          </div>
          <QrPublicThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
