"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type ConnectStatus = {
  accountId: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  readyForPayments: boolean;
};

type StripeConnectSectionProps = {
  initialStatus: ConnectStatus;
  stripeConfigured: boolean;
  /** Company policy: clients may self-serve 2/3 split on public invoices. */
  clientPaymentPlansEnabled: boolean;
};

export function StripeConnectSection({
  initialStatus,
  stripeConfigured,
  clientPaymentPlansEnabled: initialClientPlans,
}: StripeConnectSectionProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [clientPlans, setClientPlans] = useState(initialClientPlans);
  const [loading, setLoading] = useState<"onboard" | "login" | "refresh" | "policy" | null>(
    null,
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeParam = params.get("stripe");
    if (stripeParam !== "return" && stripeParam !== "refresh") return;

    void (async () => {
      setLoading("refresh");
      try {
        const response = await fetch("/api/stripe/connect");
        const data = await response.json();
        if (response.ok && data.status) {
          setStatus(data.status);
          if (data.status.readyForPayments) {
            toast.success("Stripe is connected — clients can pay invoices online");
          } else if (stripeParam === "return") {
            toast.message("Stripe onboarding saved", {
              description: "Finish any remaining steps if card payments are still disabled.",
            });
          } else {
            toast.message("Continue Stripe onboarding to enable payments");
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(null);
        router.replace("/settings/billing");
        router.refresh();
      }
    })();
  }, [router]);

  async function runAction(action: "onboard" | "login") {
    setLoading(action);
    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not open Stripe");
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No Stripe URL returned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setLoading(null);
    }
  }

  async function toggleClientPlans(enabled: boolean) {
    const previous = clientPlans;
    setClientPlans(enabled);
    setLoading("policy");
    try {
      const response = await fetch("/api/company/payment-plan-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientPaymentPlansEnabled: enabled }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not save policy");
      }
      setClientPlans(Boolean(data.clientPaymentPlansEnabled));
      toast.success(
        enabled
          ? "Clients can split unpaid invoices into 2 or 3 payments"
          : "Client self-serve payment plans turned off",
      );
      router.refresh();
    } catch (error) {
      setClientPlans(previous);
      toast.error(error instanceof Error ? error.message : "Could not save policy");
    } finally {
      setLoading(null);
    }
  }

  if (!stripeConfigured) {
    return (
      <Card id="settings-stripe" className="scroll-mt-20">
        <CardHeader>
          <CardTitle>Online card payments</CardTitle>
          <CardDescription>
            Stripe is not configured on this server yet. Add Stripe API keys to enable Connect.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const ready = status.readyForPayments;

  return (
    <Card id="settings-stripe" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Online card payments</CardTitle>
        <CardDescription>
          Connect your own Stripe account so clients can pay invoices with a card. Money goes to
          your Stripe balance — Invoice Desk takes no payment cut. Stripe&apos;s standard card
          processing fees still apply.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/70 bg-muted/40 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            {ready
              ? "Connected — ready to accept card payments"
              : status.accountId
                ? "Onboarding in progress"
                : "Not connected"}
          </p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>Details submitted: {status.detailsSubmitted ? "Yes" : "No"}</li>
            <li>Charges enabled: {status.chargesEnabled ? "Yes" : "No"}</li>
            <li>Payouts enabled: {status.payoutsEnabled ? "Yes" : "No"}</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="cursor-pointer"
            disabled={loading !== null}
            onClick={() => void runAction("onboard")}
          >
            {loading === "onboard" || loading === "refresh" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            {ready ? "Update Stripe details" : status.accountId ? "Continue setup" : "Connect Stripe"}
          </Button>

          {status.detailsSubmitted ? (
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={loading !== null}
              onClick={() => void runAction("login")}
            >
              {loading === "login" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <ExternalLinkIcon className="size-4" />
              )}
              Stripe dashboard
            </Button>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 px-4 py-3">
          <div className="space-y-1">
            <Label htmlFor="client-payment-plans" className="text-sm font-medium">
              Let clients split into a payment plan
            </Label>
            <p className="text-xs text-muted-foreground">
              Company policy: unpaid invoices show “Split into 2 / 3” on the public page. Off by
              default — only your team can offer a plan until you turn this on.
            </p>
          </div>
          <Switch
            id="client-payment-plans"
            checked={clientPlans}
            disabled={loading !== null || !ready}
            onCheckedChange={(checked) => void toggleClientPlans(checked)}
            aria-label="Allow clients to self-serve payment plans"
          />
        </div>
        {!ready ? (
          <p className="text-xs text-muted-foreground">
            Connect Stripe before enabling client payment plans.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
