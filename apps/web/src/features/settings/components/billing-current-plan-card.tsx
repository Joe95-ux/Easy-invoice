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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SwitchPlanDialog } from "@/features/settings/components/switch-plan-dialog";
import {
  formatPlanPriceLabel,
  getPlanDefinition,
  normalizePlanId,
  type BillingInterval,
  type PlanId,
} from "@/features/settings/lib/plans-catalog";
import { openBillingPortal } from "@/features/settings/lib/open-billing-portal";
import { billingButtonClassName } from "@/features/settings/lib/billing-ui";
import { cn } from "@/lib/utils";

type UsageSnapshot = {
  invoicesThisMonth: number;
  invoicesLimit: number | null;
  qrCodes: number;
  qrCodesLimit: number | null;
  members: number;
  membersLimit: number | null;
};

type BillingCurrentPlanCardProps = {
  plan: string;
  hasCustomer: boolean;
  hasSubscription: boolean;
  billingConfigured: boolean;
  hasYearlyPrice: boolean;
  billingInterval?: BillingInterval;
  subscriptionStatus?: string | null;
  cancelAtPeriodEnd?: boolean;
  usage?: UsageSnapshot | null;
};

export function BillingCurrentPlanCard({
  plan,
  hasCustomer,
  hasSubscription,
  billingConfigured,
  hasYearlyPrice,
  billingInterval = "monthly",
  subscriptionStatus = null,
  cancelAtPeriodEnd = false,
  usage = null,
}: BillingCurrentPlanCardProps) {
  const router = useRouter();
  const currentPlan = normalizePlanId(plan);
  const definition = getPlanDefinition(currentPlan);
  const price = formatPlanPriceLabel(currentPlan, billingInterval);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const pastDue = subscriptionStatus === "past_due";
  const trialing = subscriptionStatus === "trialing";
  const canOpenPortal = hasCustomer && billingConfigured;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    const sessionId = params.get("session_id");

    if (billing === "success") {
      void (async () => {
        if (sessionId?.startsWith("cs_")) {
          try {
            await fetch("/api/stripe/billing/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
            });
          } catch {
            // Webhook may still apply; refresh either way.
          }
        }
        toast.success("Welcome to Pro — your plan is updated");
        router.replace("/settings/billing");
        router.refresh();
      })();
    } else if (billing === "canceled") {
      toast.message("Checkout canceled");
      router.replace("/settings/billing");
    } else if (billing === "portal") {
      toast.message("Billing updated", {
        description: "Any plan changes from the customer portal are synced automatically.",
      });
      router.replace("/settings/billing");
      router.refresh();
    }
  }, [router]);

  async function handlePortal(
    flow?: Parameters<typeof openBillingPortal>[0],
  ) {
    setPortalLoading(true);
    try {
      await openBillingPortal(flow);
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
              {trialing ? " · Trial" : null}
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
                  disabled={portalLoading}
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
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuItem className="cursor-pointer" onClick={() => setSwitchOpen(true)}>
                Switch plan
              </DropdownMenuItem>
              {canOpenPortal ? (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => void handlePortal()}
                  >
                    Manage billing
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => void handlePortal("payment_method_update")}
                  >
                    Update payment method
                  </DropdownMenuItem>
                  {hasSubscription && hasYearlyPrice ? (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => void handlePortal("subscription_update")}
                    >
                      Change billing interval
                    </DropdownMenuItem>
                  ) : null}
                  {hasSubscription && !cancelAtPeriodEnd ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => void handlePortal("subscription_cancel")}
                      >
                        Cancel subscription
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{price.amount}</span>
            <span> / {price.hint}</span>
            {billingInterval === "yearly" && currentPlan === "PRO" ? (
              <span className="text-muted-foreground"> · billed yearly</span>
            ) : null}
            <span className="mx-1.5 text-border">·</span>
            {definition.summary}
          </p>

          {pastDue ? (
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-destructive">
                Payment past due. Update your card to keep Pro features.
              </p>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "shrink-0 cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10",
                  billingButtonClassName,
                )}
                disabled={portalLoading || !canOpenPortal}
                onClick={() => void handlePortal("payment_method_update")}
              >
                {portalLoading ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
                Update card
              </Button>
            </div>
          ) : null}

          {cancelAtPeriodEnd ? (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Your Pro plan will end at the close of the current billing period. You can resume in
              Manage billing before then.
            </div>
          ) : null}

          {usage && !usage.invoicesLimit && !usage.qrCodesLimit ? null : usage ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              {usage.invoicesLimit != null ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Invoices this month</dt>
                  <dd className="font-medium tabular-nums">
                    {usage.invoicesThisMonth} / {usage.invoicesLimit}
                  </dd>
                </div>
              ) : null}
              {usage.qrCodesLimit != null ? (
                <div>
                  <dt className="text-xs text-muted-foreground">QR codes</dt>
                  <dd className="font-medium tabular-nums">
                    {usage.qrCodes} / {usage.qrCodesLimit}
                  </dd>
                </div>
              ) : null}
              {usage.membersLimit != null ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Team seats</dt>
                  <dd className="font-medium tabular-nums">
                    {usage.members} / {usage.membersLimit}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
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
