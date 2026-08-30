"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCardIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { suggestedPartialAmount } from "@/lib/collections/advice";
import { formatMoney } from "@/lib/invoices";
import { portalHomePath } from "@/lib/portal/urls";

type InvoicePayButtonProps = {
  token: string;
  balanceDue: number;
  currency: string;
  canPayOnline: boolean;
  alreadyPaid: boolean;
  /** Next unpaid installment when a plan already exists. */
  nextDueAmount?: number | null;
  /**
   * Company policy: clients may self-serve split into 2/3.
   * Only true when the business enabled it in Settings.
   */
  canOfferPlan?: boolean;
  /** When true (portal session), return to /portal after pay/cancel. */
  returnToPortal?: boolean;
};

export function InvoicePayButton({
  token,
  balanceDue,
  currency,
  canPayOnline,
  alreadyPaid,
  nextDueAmount = null,
  canOfferPlan = false,
  returnToPortal = false,
}: InvoicePayButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [planOffered, setPlanOffered] = useState(false);
  const [localNextDue, setLocalNextDue] = useState<number | null>(null);

  const effectiveNextDue = localNextDue ?? nextDueAmount;
  const offerPlan = canOfferPlan && !planOffered;
  /** Plan exists and something remains after this installment. */
  const hasInstallmentDue =
    effectiveNextDue != null &&
    effectiveNextDue > 0.001 &&
    effectiveNextDue < balanceDue - 0.001;
  const halfAmount =
    !hasInstallmentDue && !planOffered
      ? suggestedPartialAmount(balanceDue)
      : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromPortal = returnToPortal || params.get("from") === "portal";
    if (params.get("paid") === "1") {
      const sessionId = params.get("session_id");
      void (async () => {
        if (sessionId) {
          try {
            await fetch(`/api/public/invoices/${token}/checkout/confirm`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId }),
            });
          } catch {
            // Webhook may still record the payment.
          }
        }
        if (fromPortal) {
          router.replace(portalHomePath({ paid: true }));
          return;
        }
        toast.success("Payment received — thank you!");
        router.replace(`/view/invoices/${token}`);
        router.refresh();
      })();
    } else if (params.get("canceled") === "1") {
      if (fromPortal) {
        router.replace(portalHomePath({ canceled: true }));
        return;
      }
      toast.message("Checkout canceled");
      router.replace(`/view/invoices/${token}`);
      router.refresh();
    }
  }, [router, token, returnToPortal]);

  if (alreadyPaid) {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
        <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">
          This invoice is paid in full.
        </div>
        {returnToPortal ? (
          <Button
            type="button"
            variant="outline"
            className="w-full cursor-pointer sm:w-auto"
            onClick={() => router.push(portalHomePath())}
          >
            Back to portal
          </Button>
        ) : null}
      </div>
    );
  }

  if (!canPayOnline || balanceDue <= 0) {
    return null;
  }

  async function startCheckout(amount?: number) {
    setLoading(amount != null ? `amount-${amount}` : "full");
    try {
      const response = await fetch(`/api/public/invoices/${token}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(amount != null ? { amount } : {}),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not start payment");
      }
      if (!data.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setLoading(null);
    }
  }

  async function startPaymentPlan(parts: 2 | 3) {
    setLoading(`plan-${parts}`);
    try {
      const planRes = await fetch(`/api/public/invoices/${token}/payment-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts }),
      });
      const planData = await planRes.json();
      if (!planRes.ok) {
        throw new Error(planData.error ?? "Could not create payment plan");
      }

      const firstAmount =
        typeof planData.nextDueAmount === "number"
          ? planData.nextDueAmount
          : Math.round((balanceDue / parts) * 100) / 100;

      setPlanOffered(true);
      setLocalNextDue(firstAmount);
      router.refresh();

      toast.success(`Payment plan set — paying first of ${parts} now`);
      await startCheckout(firstAmount);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setLoading(null);
    }
  }

  const busy = loading !== null;
  const primaryAmount = hasInstallmentDue ? effectiveNextDue! : balanceDue;
  const primaryLoadingKey = hasInstallmentDue
    ? `amount-${effectiveNextDue}`
    : "full";

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <Button
        type="button"
        size="lg"
        className="w-full cursor-pointer sm:w-auto"
        disabled={busy}
        onClick={() =>
          void startCheckout(hasInstallmentDue ? effectiveNextDue! : undefined)
        }
      >
        {loading === primaryLoadingKey ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <CreditCardIcon className="size-4" />
        )}
        {hasInstallmentDue
          ? `Pay ${formatMoney(primaryAmount, currency)} due`
          : `Pay ${formatMoney(balanceDue, currency)}`}
      </Button>

      {hasInstallmentDue ? (
        <Button
          type="button"
          variant="outline"
          className="w-full cursor-pointer sm:w-auto"
          disabled={busy}
          onClick={() => void startCheckout()}
        >
          {loading === "full" ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : null}
          Pay remaining balance ({formatMoney(balanceDue, currency)})
        </Button>
      ) : null}

      {halfAmount != null ? (
        <Button
          type="button"
          variant="outline"
          className="w-full cursor-pointer sm:w-auto"
          disabled={busy}
          onClick={() => void startCheckout(halfAmount)}
        >
          {loading === `amount-${halfAmount}` ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : null}
          Pay half now ({formatMoney(halfAmount, currency)})
        </Button>
      ) : null}

      {offerPlan ? (
        <div className="flex w-full flex-col gap-1.5 sm:items-end">
          <p className="text-xs text-muted-foreground">Can&apos;t pay in full?</p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="w-full cursor-pointer sm:w-auto"
              disabled={busy}
              onClick={() => void startPaymentPlan(2)}
            >
              {loading === "plan-2" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Split into 2
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full cursor-pointer sm:w-auto"
              disabled={busy}
              onClick={() => void startPaymentPlan(3)}
            >
              {loading === "plan-3" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Split into 3
            </Button>
          </div>
        </div>
      ) : null}

      {planOffered && hasInstallmentDue && loading === null ? (
        <p className="text-xs text-muted-foreground sm:text-right">
          Plan saved. Use Pay due if checkout did not open.
        </p>
      ) : null}

      <p className="text-center text-xs text-muted-foreground sm:text-right">
        {hasInstallmentDue
          ? "Pays this installment · you can still clear the full balance"
          : "Secure card payment · paid to the business via Stripe"}
      </p>
    </div>
  );
}
