import Link from "next/link";
import type { ReactNode } from "react";
import { AppLogo } from "@/components/app-logo";
import { QrPublicThemeToggle } from "@/features/qr-codes/components/qr-public-theme-toggle";

export default function PublicFormLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[980px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="min-w-0 shrink" aria-label="Invoice Desk home">
            <AppLogo textClassName="truncate max-[380px]:hidden" />
          </Link>
          <QrPublicThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-[980px] px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
