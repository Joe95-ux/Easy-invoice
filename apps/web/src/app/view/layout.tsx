import Link from "next/link";
import type { ReactNode } from "react";
import { AppLogo } from "@/components/app-logo";
import { QrPublicThemeToggle } from "@/features/qr-codes/components/qr-public-theme-toggle";

export default function PublicViewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/">
            <AppLogo />
          </Link>
          <QrPublicThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
