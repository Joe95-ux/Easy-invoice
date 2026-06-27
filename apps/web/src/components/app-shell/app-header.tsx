"use client";

import { UserButton } from "@clerk/nextjs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

type AppHeaderProps = {
  title?: string;
  description?: string;
};

export function AppHeader({ title, description }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/65 md:px-6">
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
      <div className="flex items-center gap-2">
        <div className="md:hidden">
          <ThemeToggle />
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
