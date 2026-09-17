"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { CheckSquareIcon, ChevronDownIcon, ChevronRightIcon, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/invoices";
import { cn } from "@/lib/utils";

export type AttentionFollowUpPreview = {
  id: string;
  title: string;
  dueDate: string | null;
  isOverdue: boolean;
  href: string;
  context: string | null;
};

export type AttentionUnbilledPreview = {
  id: string;
  description: string;
  date: string;
  hours: number;
  value: number;
  clientId: string | null;
  clientName: string | null;
  invoiceHref: string | null;
};

export type DashboardFollowUpAttention = {
  actionable: number;
  overdue: number;
  dueToday: number;
  previews: AttentionFollowUpPreview[];
};

export type DashboardUnbilledAttention = {
  entryCount: number;
  totalHours: number;
  totalValue: number;
  clientCount: number;
  previews: AttentionUnbilledPreview[];
};

type DashboardAttentionProps = {
  followUps: DashboardFollowUpAttention;
  unbilledTime: DashboardUnbilledAttention;
  currency: string;
};

/**
 * Inbox-style attention list with Google Calendar–like left color bands
 * and expandable previews (caret toggles ~5 items + view all).
 */
export function DashboardAttention({
  followUps,
  unbilledTime,
  currency,
}: DashboardAttentionProps) {
  const showFollowUps = followUps.actionable > 0;
  const showUnbilled = unbilledTime.entryCount > 0;
  if (!showFollowUps && !showUnbilled) return null;

  const followUpMeta = [
    followUps.overdue > 0 ? `${followUps.overdue} overdue` : null,
    followUps.dueToday > 0 ? `${followUps.dueToday} due today` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const unbilledMeta = [
    formatMoney(unbilledTime.totalValue, currency),
    `${unbilledTime.entryCount} entr${unbilledTime.entryCount === 1 ? "y" : "ies"}`,
    unbilledTime.clientCount > 0
      ? `${unbilledTime.clientCount} client${unbilledTime.clientCount === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-medium tracking-tight">Needs attention</h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {(showFollowUps ? 1 : 0) + (showUnbilled ? 1 : 0)}
        </span>
      </div>

      <ul className="divide-y divide-border">
        {showFollowUps && (
          <AttentionGroup
            accent="warning"
            icon={CheckSquareIcon}
            title={`${followUps.actionable} follow-up${followUps.actionable === 1 ? "" : "s"}`}
            meta={followUpMeta || "Needs a response"}
            viewAllHref="/follow-ups"
            viewAllLabel="View all follow-ups"
          >
            {followUps.previews.map((item) => (
              <PreviewRow
                key={item.id}
                title={item.title}
                meta={[
                  item.context,
                  item.dueDate
                    ? item.isOverdue
                      ? `Overdue · ${item.dueDate}`
                      : `Due ${item.dueDate}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                href={item.href}
                actionLabel={followUpActionLabel(item.href)}
              />
            ))}
          </AttentionGroup>
        )}

        {showUnbilled && (
          <AttentionGroup
            accent="primary"
            icon={ClockIcon}
            title={`${formatHours(unbilledTime.totalHours)} unbilled`}
            meta={unbilledMeta}
            viewAllHref="/time"
            viewAllLabel="View all time"
          >
            {unbilledTime.previews.map((item) => (
              <PreviewRow
                key={item.id}
                title={item.description}
                meta={[
                  item.clientName,
                  item.date,
                  `${item.hours}h`,
                  formatMoney(item.value, currency),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                href={item.invoiceHref ?? "/time"}
                actionLabel={item.invoiceHref ? "Invoice" : "Open"}
              />
            ))}
          </AttentionGroup>
        )}
      </ul>
    </section>
  );
}

function AttentionGroup({
  accent,
  icon: Icon,
  title,
  meta,
  viewAllHref,
  viewAllLabel,
  children,
}: {
  accent: "warning" | "primary";
  icon: ComponentType<{ className?: string }>;
  title: string;
  meta: string;
  viewAllHref: string;
  viewAllLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const band = accent === "warning" ? "bg-warning" : "bg-primary";

  return (
    <li>
      <div className="flex">
        <div className={cn("w-1 shrink-0 self-stretch", band)} aria-hidden />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
            </div>
            {open ? (
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </button>

          {open && (
            <div className="border-t border-border bg-muted/20 pb-2">
              <ul className="divide-y divide-border/70">{children}</ul>
              <div className="px-3 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-between px-2 text-muted-foreground hover:text-foreground"
                  render={<Link href={viewAllHref} />}
                >
                  {viewAllLabel}
                  <ChevronRightIcon className="size-3.5 opacity-70" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function PreviewRow({
  title,
  meta,
  href,
  actionLabel,
}: {
  title: string;
  meta: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <li className="flex items-center gap-2 px-3 py-2.5 pl-10">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{title}</p>
        {meta ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p> : null}
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary hover:underline"
      >
        {actionLabel}
        <ChevronRightIcon className="size-3 opacity-70" aria-hidden />
      </Link>
    </li>
  );
}

function followUpActionLabel(href: string): string {
  if (href.startsWith("/invoices/")) return "Invoice";
  if (href.startsWith("/estimates/")) return "Estimate";
  return "Open";
}

function formatHours(hours: number): string {
  if (Number.isInteger(hours)) return `${hours}h`;
  return `${Math.round(hours * 10) / 10}h`;
}
