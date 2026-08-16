"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type BillingSectionProps = {
  plan: string;
  hasSubscription: boolean;
  billingConfigured: boolean;
  hasYearlyPrice: boolean;
  trialDays: number;
};

const PRO_FEATURES = [
  "Custom branding & logo on every PDF",
  "Email invoices & payment tracking",
  "Priority support",
  "Everything in Free",
] as const;

function formatPlanLabel(plan: string) {
  return plan.charAt(0) + plan.slice(1).toLowerCase();
}

export function BillingSettingsSection({
  plan,
  hasSubscription,
  billingConfigured,
  hasYearlyPrice,
  trialDays,
}: BillingSectionProps) {
  const router = useRouter();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const isPaid = plan.toUpperCase() !== "FREE";

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

  async function run(action: "checkout" | "portal") {
    setLoading(action);
    try {
      const response = await fetch("/api/stripe/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "portal" ? { action: "portal" } : { action: "checkout", interval },
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Billing request failed");
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No billing URL returned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setLoading(null);
    }
  }

  if (!billingConfigured) {
    return (
      <Card id="settings-billing" className="scroll-mt-20">
        <CardHeader>
          <CardTitle>Plan & billing</CardTitle>
          <CardDescription>
            Subscription billing is not configured on this server yet. Add Stripe Price IDs to
            enable Pro upgrades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Current plan: <span className="font-medium text-foreground">{formatPlanLabel(plan)}</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="settings-billing" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Plan & billing</CardTitle>
        <CardDescription>
          Upgrade to Pro for branding, email sending, and payment tracking. Billing is handled
          securely by Stripe — separate from client invoice payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-border/70 bg-muted/40 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            Current plan: {formatPlanLabel(plan)}
            {hasSubscription ? " · Managed in Stripe" : null}
          </p>
          {!isPaid ? (
            <p className="mt-1 text-muted-foreground">
              Free forever for core invoicing. Upgrade when you want Pro features.
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">
              Manage payment method, invoices, and cancellation in the Stripe customer portal.
            </p>
          )}
        </div>

        {!isPaid ? (
          <>
            <ul className="space-y-2">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {hasYearlyPrice ? (
              <div className="inline-flex rounded-full border border-border bg-muted p-0.5">
                {(
                  [
                    { id: "monthly", label: "Monthly" },
                    { id: "yearly", label: "Yearly" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setInterval(option.id)}
                    className={cn(
                      "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      interval === option.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                className="cursor-pointer"
                disabled={loading !== null}
                onClick={() => void run("checkout")}
              >
                {loading === "checkout" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                {trialDays > 0 ? `Start ${trialDays}-day Pro trial` : "Upgrade to Pro"}
              </Button>
              <p className="text-sm text-muted-foreground">
                {interval === "yearly" ? "Billed yearly" : "$12 / month"}
                {trialDays > 0 ? " · cancel anytime during trial" : " · cancel anytime"}
              </p>
            </div>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={loading !== null}
            onClick={() => void run("portal")}
          >
            {loading === "portal" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Manage billing
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
