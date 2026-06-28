"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SidebarUserMenu } from "@/components/app-shell/sidebar-user-menu";

type SidebarFooterPanelProps = {
  plan: string;
};

function formatPlanLabel(plan: string) {
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

export function SidebarFooterPanel({ plan }: SidebarFooterPanelProps) {
  const isFree = plan.toUpperCase() === "FREE";

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="space-y-3 group-data-[collapsible=icon]:hidden">
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
      </div>

      <SidebarUserMenu />
    </div>
  );
}
