"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SwitchPlanDialog } from "@/features/settings/components/switch-plan-dialog";
import {
  formatPlanPriceLabel,
  getPlanDefinition,
  normalizePlanId,
  type PlanId,
} from "@/features/settings/lib/plans-catalog";
import { billingButtonClassName } from "@/features/settings/lib/billing-ui";
import { cn } from "@/lib/utils";

type BillingCurrentPlanCardProps = {
  plan: string;
  hasSubscription: boolean;
  billingConfigured: boolean;
  hasYearlyPrice: boolean;
};

export function BillingCurrentPlanCard({
  plan,
  hasSubscription,
  billingConfigured,
  hasYearlyPrice,
}: BillingCurrentPlanCardProps) {
  const router = useRouter();
  const currentPlan = normalizePlanId(plan);
  const definition = getPlanDefinition(currentPlan);
  const price = formatPlanPriceLabel(currentPlan, "monthly");
  const [switchOpen, setSwitchOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (billing === "success") {
      toast.success("Welcome to Pro — your plan is updating");
      router.replace("/settings/billing");
      router.refresh();
    } else if (billing === "canceled") {
      toast.message("Checkout canceled");
      router.replace("/settings/billing");
    }
  }, [router]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "portal" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open billing portal");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No portal URL returned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setPortalLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">Current plan</CardTitle>
            <p className="text-sm text-muted-foreground">
              {definition.name}
              {hasSubscription ? " · Billed via Stripe" : null}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "shrink-0 cursor-pointer text-muted-foreground hover:text-foreground",
                    billingButtonClassName,
                  )}
                />
              }
            >
              {portalLoading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <>
                  Manage
                  <ChevronDownIcon className="size-3.5 opacity-60" />
                </>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem className="cursor-pointer" onClick={() => setSwitchOpen(true)}>
                Switch plan
              </DropdownMenuItem>
              {hasSubscription ? (
                <DropdownMenuItem className="cursor-pointer" onClick={() => void openPortal()}>
                  Manage billing
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{price.amount}</span>
            <span> / {price.hint}</span>
            <span className="mx-1.5 text-border">·</span>
            {definition.summary}
          </p>
        </CardContent>
      </Card>

      <SwitchPlanDialog
        open={switchOpen}
        onOpenChange={setSwitchOpen}
        currentPlan={currentPlan as PlanId}
        billingConfigured={billingConfigured}
        hasYearlyPrice={hasYearlyPrice}
      />
    </>
  );
}
