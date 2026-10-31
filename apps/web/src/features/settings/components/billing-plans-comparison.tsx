"use client";

import { useState } from "react";
import { ArrowUpRightIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BillingCheckoutButton } from "@/features/settings/components/billing-checkout-button";
import { PlansComparisonTable } from "@/features/settings/components/plans-comparison-table";
import { SupportContactDialog } from "@/components/app-shell/support-contact-dialog";
import { billingButtonClassName } from "@/features/settings/lib/billing-ui";
import { openBillingPortal } from "@/features/settings/lib/open-billing-portal";
import {
  normalizePlanId,
  type BillingInterval,
} from "@/features/settings/lib/plans-catalog";
import { cn } from "@/lib/utils";

type BillingPlansComparisonProps = {
  currentPlan: string;
  billingConfigured: boolean;
  hasYearlyPrice: boolean;
  canManageBilling?: boolean;
};

export function BillingPlansComparison({
  currentPlan,
  billingConfigured,
  hasYearlyPrice,
  canManageBilling = true,
}: BillingPlansComparisonProps) {
  const current = normalizePlanId(currentPlan);
  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const [supportOpen, setSupportOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  async function openPortal() {
    setPortalLoading(true);
    try {
      await openBillingPortal("subscription_cancel");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setPortalLoading(false);
    }
  }

  const mutedActionClass = cn(
    "w-full cursor-default bg-muted text-muted-foreground disabled:opacity-100",
    billingButtonClassName,
  );

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        You are on the{" "}
        <span className="font-medium text-foreground">
          {current === "PRO" ? "Pro" : "Free"} plan
        </span>
        . If you have any questions or would like further support with your plan,{" "}
        <button
          type="button"
          onClick={() => setSupportOpen(true)}
          className="inline-flex cursor-pointer items-center gap-0.5 font-medium text-foreground underline-offset-4 hover:underline"
        >
          contact us
          <ArrowUpRightIcon className="size-3.5" />
        </button>
        .
      </p>

      <PlansComparisonTable
        interval={interval}
        onIntervalChange={setInterval}
        hasYearlyPrice={hasYearlyPrice}
        freeAction={
          current === "FREE" ? (
            <Button variant="ghost" disabled className={mutedActionClass}>
              Current plan
            </Button>
          ) : canManageBilling ? (
            <Button
              variant="ghost"
              className={cn("w-full cursor-pointer", billingButtonClassName)}
              disabled={portalLoading}
              onClick={() => void openPortal()}
            >
              {portalLoading ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Downgrade
            </Button>
          ) : (
            <Button variant="ghost" disabled className={mutedActionClass}>
              Ask an admin
            </Button>
          )
        }
        proAction={
          current === "PRO" ? (
            <Button variant="ghost" disabled className={mutedActionClass}>
              Current plan
            </Button>
          ) : canManageBilling ? (
            <BillingCheckoutButton
              className={cn("w-full cursor-pointer", billingButtonClassName)}
              disabled={!billingConfigured}
              label="Upgrade"
              interval={hasYearlyPrice ? interval : "monthly"}
            />
          ) : (
            <Button variant="ghost" disabled className={mutedActionClass}>
              Ask an admin to upgrade
            </Button>
          )
        }
      />

      <SupportContactDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
}
