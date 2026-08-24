"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  PlanApiError,
  throwIfApiError,
  toastApiError,
} from "@/lib/billing/plan-api-error";
import { useCompanyPlan } from "@/components/billing/company-plan-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { billingButtonClassName } from "@/features/settings/lib/billing-ui";
import { cn } from "@/lib/utils";

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

function StatusRow({
  label,
  complete,
}: {
  label: string;
  complete: boolean;
}) {
  return (
    <div className="grid min-h-[42px] grid-cols-[18px_1fr_auto] items-center gap-2.5 border-b border-border first:border-t">
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-full text-[9px] font-extrabold",
          complete
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "border border-border text-muted-foreground",
        )}
        aria-hidden
      >
        {complete ? <CheckIcon className="size-2.5 stroke-3" /> : null}
      </span>
      <span className="min-w-0 text-[12.5px] font-semibold text-foreground">{label}</span>
      <span
        className={cn(
          "text-xs",
          complete ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
        )}
      >
        {complete ? "Complete" : "Pending"}
      </span>
    </div>
  );
}

function OverallStateBadge({
  state,
}: {
  state: "ready" | "incomplete" | "disconnected";
}) {
  const label =
    state === "ready"
      ? "Ready for payments"
      : state === "incomplete"
        ? "Setup incomplete"
        : "Not connected";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold",
        state === "ready" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        state === "incomplete" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        state === "disconnected" && "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          state === "ready" && "bg-emerald-500",
          state === "incomplete" && "bg-amber-500",
          state === "disconnected" && "bg-muted-foreground/50",
        )}
      />
      {label}
    </span>
  );
}

export function StripeConnectSection({
  initialStatus,
  stripeConfigured,
  clientPaymentPlansEnabled: initialClientPlans,
}: StripeConnectSectionProps) {
  const router = useRouter();
  const { isPro } = useCompanyPlan();
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
    if (!isPro) {
      toastApiError(
        new PlanApiError("Payment plans are available on Pro", "PRO_REQUIRED"),
        "Payment plans are available on Pro",
      );
      return;
    }
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
      throwIfApiError(response, data, "Could not save policy");
      setClientPlans(Boolean(data.clientPaymentPlansEnabled));
      toast.success(
        enabled
          ? "Clients can split unpaid invoices into 2 or 3 payments"
          : "Client self-serve payment plans turned off",
      );
      router.refresh();
    } catch (error) {
      setClientPlans(previous);
      toastApiError(error, "Could not save policy");
    } finally {
      setLoading(null);
    }
  }

  if (!stripeConfigured) {
    return (
      <Card id="settings-stripe" className="scroll-mt-20 gap-0 overflow-hidden py-0">
        <div className="space-y-2 px-5 py-6 sm:px-7 sm:py-6.5">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Online card payments
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Stripe is not configured on this server yet. Add Stripe API keys to enable Connect.
          </p>
        </div>
      </Card>
    );
  }

  const ready = status.readyForPayments;
  const setupIncomplete = Boolean(status.accountId) && !ready;
  const overallState = ready ? "ready" : setupIncomplete ? "incomplete" : "disconnected";
  const primaryLabel = ready
    ? "Update Stripe details"
    : status.accountId
      ? "Continue setup"
      : "Connect Stripe";

  return (
    <Card id="settings-stripe" className="scroll-mt-20 gap-0 overflow-hidden py-0">
      {/* Payments */}
      <div className="px-5 py-6 sm:px-7 sm:py-6.5">
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Online card payments
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Accept card payments through your Stripe account. Funds go directly to Stripe and Invoice
            Desk takes no payment cut.
          </p>
        </div>

        <div className="mt-6 border-t border-border pt-4.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- static public brand asset */}
              <img
                src="/stripe-com-logo.png"
                alt=""
                width={24}
                height={24}
                className="size-6 shrink-0 rounded-[7px] object-contain"
                aria-hidden
              />
              <span className="text-sm font-semibold">Stripe</span>
            </div>
            <OverallStateBadge state={overallState} />
          </div>

          <div className="mt-3.5" aria-label="Stripe account status">
            <StatusRow label="Details submitted" complete={status.detailsSubmitted} />
            <StatusRow label="Charges enabled" complete={status.chargesEnabled} />
            <StatusRow label="Payouts enabled" complete={status.payoutsEnabled} />
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <p className="text-[11.5px] leading-snug text-muted-foreground">
              Stripe&apos;s standard processing fees still apply.
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {status.detailsSubmitted ? (
                <Button
                  type="button"
                  variant="outline"
                  className={cn("cursor-pointer", billingButtonClassName)}
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
              <Button
                type="button"
                className={cn("cursor-pointer sm:min-w-32", billingButtonClassName)}
                disabled={loading !== null}
                onClick={() => void runAction("onboard")}
              >
                {loading === "onboard" || loading === "refresh" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                {primaryLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Installments — keep existing footer; Pro badge matches design */}
      <div className="border-t border-border px-5 py-6 sm:px-7 sm:py-6.5">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-[15px] font-semibold tracking-tight">
                Let clients pay in installments
              </p>
              <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 text-[10px] font-extrabold tracking-wide text-primary uppercase">
                Pro
              </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              Allow clients to split eligible invoices into scheduled payments.
            </p>
            {!isPro ? (
              <p className="mt-3">
                <Link
                  href="/settings/billing/plans"
                  className="text-[13px] font-semibold text-primary hover:text-primary/80"
                >
                  Upgrade to Pro →
                </Link>
              </p>
            ) : null}
          </div>
          <Switch
            id="client-payment-plans"
            checked={clientPlans}
            disabled={loading !== null || !ready || !isPro}
            onCheckedChange={(checked) => void toggleClientPlans(checked)}
            aria-label="Allow clients to self-serve payment plans"
            className="mt-0.5 shrink-0"
          />
        </div>

        <p className="mt-3.5 border-t border-dashed border-border pt-3.5 text-xs leading-relaxed text-muted-foreground">
          {!isPro
            ? "When enabled, eligible unpaid invoices can show installment options on the public payment page."
            : !ready
              ? "Connect Stripe before enabling client payment plans."
              : "When enabled, eligible unpaid invoices can show installment options on the public payment page."}
        </p>
      </div>
    </Card>
  );
}
