"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SidebarUserMenu } from "@/components/app-shell/sidebar-user-menu";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sidebar:upgrade-card";

type SidebarFooterPanelProps = {
  plan: string;
};

function formatPlanLabel(plan: string) {
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

function readExpanded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "expanded";
  } catch {
    return false;
  }
}

export function SidebarFooterPanel({ plan }: SidebarFooterPanelProps) {
  const isFree = plan.toUpperCase() === "FREE";
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(readExpanded());
  }, []);

  function setOpen(next: boolean) {
    setExpanded(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "expanded" : "collapsed");
    } catch {
      /* ignore quota / private mode */
    }
  }

  const planLabel = formatPlanLabel(plan);
  const chipLabel = isFree ? "Upgrade to Pro" : planLabel;

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="group-data-[collapsible=icon]:hidden">
        {expanded ? (
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground">Current plan</p>
                <p className="mt-0.5 truncate text-sm text-sidebar-foreground/70">
                  {isFree ? "Free forever" : `${planLabel} plan`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge variant="secondary" className="text-[10px]">
                  {planLabel}
                </Badge>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground/60 outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  aria-expanded
                  aria-label="Collapse plan card"
                >
                  <ChevronUpIcon className="size-3.5" />
                </button>
              </div>
            </div>
            <Link
              href="/settings/billing"
              className="mt-2 block text-xs font-medium text-primary hover:underline"
            >
              {isFree ? "Upgrade to Pro" : "Manage billing"}
            </Link>
          </div>
        ) : (
          <div
            className={cn(
              "flex h-7 items-center overflow-hidden rounded-full",
              isFree
                ? "bg-primary text-primary-foreground"
                : "border border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground",
            )}
          >
            <Link
              href="/settings/billing"
              className={cn(
                "inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                isFree ? "hover:bg-primary/80" : "hover:bg-sidebar-accent",
              )}
            >
              {isFree ? <SparklesIcon className="size-3" /> : null}
              <span className="truncate">{chipLabel}</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                isFree
                  ? "text-primary-foreground/80 hover:bg-primary/80 hover:text-primary-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
              aria-expanded={false}
              aria-label="Expand plan card"
            >
              <ChevronDownIcon className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <SidebarUserMenu />
    </div>
  );
}
