"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRightIcon, CheckIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { billingButtonClassName } from "@/features/settings/lib/billing-ui";
import { openBillingPortal } from "@/features/settings/lib/open-billing-portal";
import {
  BILLING_PLANS,
  formatPlanPriceLabel,
  getPlanDefinition,
  type BillingInterval,
  type PlanId,
} from "@/features/settings/lib/plans-catalog";
import { cn } from "@/lib/utils";

type SwitchPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: PlanId;
  billingConfigured: boolean;
  hasYearlyPrice: boolean;
};

export function SwitchPlanDialog({
  open,
  onOpenChange,
  currentPlan,
  billingConfigured,
  hasYearlyPrice,
}: SwitchPlanDialogProps) {
  const [selected, setSelected] = useState<PlanId>(currentPlan);
  const [interval, setInterval] = useState<BillingInterval>(
    hasYearlyPrice ? "yearly" : "monthly",
  );
  const [loading, setLoading] = useState(false);

  const selectedPlan = getPlanDefinition(selected);
  const price = formatPlanPriceLabel(selected, interval);
  const isCurrent = selected === currentPlan;
  const upgradingToPro = selected === "PRO" && currentPlan === "FREE";
  const downgradingToFree = selected === "FREE" && currentPlan === "PRO";

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelected(currentPlan);
      setLoading(false);
    } else {
      setSelected(currentPlan);
    }
    onOpenChange(next);
  }

  async function handleSwitch() {
    if (isCurrent || !billingConfigured) return;

    setLoading(true);
    try {
      if (upgradingToPro) {
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
      }

      if (downgradingToFree) {
        await openBillingPortal("subscription_cancel");
        return;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl" showCloseButton>
        <DialogHeader className="pr-12 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <DialogTitle>Switch plan</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto gap-1 px-0 text-muted-foreground hover:text-foreground sm:-mr-2"
            render={<Link href="/settings/billing/plans" />}
            onClick={() => onOpenChange(false)}
          >
            <ArrowUpRightIcon className="size-3.5" />
            Compare plans
          </Button>
        </DialogHeader>

        <DialogBody className="p-0">
          <div className="grid min-h-64 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <div className="flex flex-row gap-1 overflow-x-auto border-b border-border p-3 sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0">
              {BILLING_PLANS.map((plan) => {
                const active = plan.id === selected;
                const isCurrentPlan = plan.id === currentPlan;
                const listPrice = formatPlanPriceLabel(
                  plan.id,
                  plan.id === "PRO" ? interval : "monthly",
                );
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelected(plan.id)}
                    className={cn(
                      "flex shrink-0 cursor-pointer flex-col rounded-lg px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <span className="text-sm font-medium">{plan.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {listPrice.amount}
                      {isCurrentPlan ? " · Current" : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <p className="font-heading text-base font-semibold tracking-tight">
                  {selectedPlan.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{selectedPlan.summary}</p>
                <p className="mt-2 text-sm">
                  <span className="font-medium text-foreground">{price.amount}</span>
                  <span className="text-muted-foreground"> / {price.hint}</span>
                </p>
                {selected === "PRO" && interval === "yearly" && hasYearlyPrice ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Billed as $120 / year
                  </p>
                ) : null}
              </div>

              {selected === "PRO" && hasYearlyPrice ? (
                <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={interval === "yearly"}
                    onCheckedChange={(checked) =>
                      setInterval(checked ? "yearly" : "monthly")
                    }
                    aria-label="Billed yearly"
                  />
                  Billed yearly
                </label>
              ) : null}

              <ul className="space-y-1">
                {selectedPlan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 rounded-md px-1 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/50"
                  >
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {downgradingToFree ? (
                <p className="text-xs text-muted-foreground">
                  Downgrades are managed in the Stripe customer portal and take effect at the end of
                  your billing period.
                </p>
              ) : null}
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className={cn("cursor-pointer", billingButtonClassName)}
            disabled={loading}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={cn("cursor-pointer", billingButtonClassName)}
            disabled={loading || isCurrent || !billingConfigured}
            onClick={() => void handleSwitch()}
          >
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {downgradingToFree ? "Continue in portal" : "Switch plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
