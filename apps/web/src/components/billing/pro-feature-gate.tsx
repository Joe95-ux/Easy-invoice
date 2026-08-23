"use client";

import Link from "next/link";
import { LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProFeatureGateProps = {
  title: string;
  description: string;
  className?: string;
  /** Compact inline banner vs full card. */
  variant?: "card" | "banner";
  ctaLabel?: string;
};

export function ProFeatureGate({
  title,
  description,
  className,
  variant = "card",
  ctaLabel = "Upgrade to Pro",
}: ProFeatureGateProps) {
  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border/60">
            <LockIcon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="shrink-0 cursor-pointer rounded-full"
          render={<Link href="/settings/billing/plans" />}
        >
          {ctaLabel}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 rounded-xl border border-border bg-muted/30 p-6",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border/60">
        <LockIcon className="size-4" />
      </span>
      <div className="space-y-1.5">
        <h3 className="font-heading text-base font-semibold tracking-tight">{title}</h3>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <Button className="cursor-pointer rounded-full" render={<Link href="/settings/billing/plans" />}>
        {ctaLabel}
      </Button>
    </div>
  );
}
