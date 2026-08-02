"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { AppLogo } from "@/components/app-logo";
import { cn } from "@/lib/utils";

export function NotebookNav() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6 sm:px-8">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <AppLogo iconClassName="size-6" />
        </Link>

        <div className="flex items-center gap-3">
          <SignedOut>
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Back home
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
          </SignedIn>

          <button
            type="button"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            disabled={!mounted}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
              "inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-background text-foreground transition-colors",
              "hover:bg-muted disabled:cursor-default disabled:opacity-60",
            )}
          >
            {isDark ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
