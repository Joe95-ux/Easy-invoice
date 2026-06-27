"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SidebarFooterPanelProps = {
  plan: string;
};

const themeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

function formatPlanLabel(plan: string) {
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

export function SidebarFooterPanel({ plan }: SidebarFooterPanelProps) {
  const { theme, setTheme } = useTheme();
  const isFree = plan.toUpperCase() === "FREE";

  return (
    <div className="space-y-3 px-2 py-2 group-data-[collapsible=icon]:hidden">
      <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground">Current plan</p>
            <p className="mt-0.5 truncate text-sm text-sidebar-foreground/70">
              {isFree ? "Free forever" : `${formatPlanLabel(plan)} plan`}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {formatPlanLabel(plan)}
          </Badge>
        </div>
        {isFree && (
          <Link
            href="/#pricing"
            className="mt-2 block text-xs font-medium text-primary hover:underline"
          >
            Upgrade to Pro
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-sidebar-foreground/60">
        <span>Theme</span>
        {themeOptions.map((option, index) => (
          <span key={option.value} className="inline-flex items-center gap-1">
            {index > 0 && <span aria-hidden>·</span>}
            <button
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                "transition-colors hover:text-sidebar-foreground",
                theme === option.value && "font-medium text-sidebar-foreground",
              )}
            >
              {option.label}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
