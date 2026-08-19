"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRightIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  getProPriceDisplay,
  PRO_UPGRADE_COLUMNS,
  type BillingInterval,
} from "@/features/settings/lib/plans-catalog";
import { billingButtonClassName } from "@/features/settings/lib/billing-ui";
import { cn } from "@/lib/utils";

type BillingUpgradeCardProps = {
  billingConfigured: boolean;
  hasYearlyPrice: boolean;
  trialDays: number;
};

export function BillingUpgradeCard({
  billingConfigured,
  hasYearlyPrice,
  trialDays,
}: BillingUpgradeCardProps) {
  const [loading, setLoading] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>(
    hasYearlyPrice ? "yearly" : "monthly",
  );

  const pricing = getProPriceDisplay(interval);
  const description =
    trialDays > 0
      ? `${pricing.headerDescription} · ${trialDays}-day trial`
      : pricing.headerDescription;

  async function upgrade() {
    if (!billingConfigured) {
      toast.error("Subscription billing is not configured yet");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkout", interval }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not start checkout");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <CardTitle className="text-base">Upgrade to Pro</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
          {hasYearlyPrice ? (
            <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={interval === "yearly"}
                onCheckedChange={(checked) => setInterval(checked ? "yearly" : "monthly")}
                aria-label="Billed yearly"
              />
              Billed yearly
            </label>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "cursor-pointer text-muted-foreground hover:text-foreground",
              billingButtonClassName,
            )}
            render={<Link href="/settings/billing/plans" />}
          >
            View plans
            <ArrowUpRightIcon className="size-3.5 opacity-70" />
          </Button>
          <Button
            size="sm"
            className={cn("cursor-pointer", billingButtonClassName)}
            disabled={loading || !billingConfigured}
            onClick={() => void upgrade()}
          >
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Upgrade now
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-1 sm:grid-cols-3 sm:gap-4">
          {PRO_UPGRADE_COLUMNS.map((column) => (
            <div key={column.title} className="space-y-1">
              <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {column.title}
              </p>
              <ul>
                {column.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50"
                  >
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
