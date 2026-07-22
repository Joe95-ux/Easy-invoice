"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { HelpSheet } from "@/components/app-shell/help-sheet";
import { NotificationBell } from "@/components/app-shell/notification-bell";
import { TimerHeaderChip } from "@/features/time/components/timer-header-chip";
import { TimerMobileNav } from "@/features/time/components/timer-mobile-nav";

type AppHeaderProps = {
  memberId: string;
  title?: string;
  description?: string;
};

export function AppHeader({ memberId, title, description }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex shrink-0 flex-col bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <TimerMobileNav />
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 px-4 md:px-6">
        <SidebarTrigger className="-ml-1" />
        <div className="min-w-0 flex-1">
          {title && (
            <h1 className="truncate font-heading text-sm font-semibold tracking-tight md:text-base">
              {title}
            </h1>
          )}
          {description && (
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <TimerHeaderChip className="hidden lg:inline-flex" />
          <NotificationBell key={memberId} memberId={memberId} />
          <Button variant="ghost" size="sm" render={<Link href="/#pricing" />}>
            Pricing
          </Button>
          <HelpSheet />
        </div>
      </div>
    </header>
  );
}
