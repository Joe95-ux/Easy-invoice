"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCardIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/invoices";

type InvoicePayButtonProps = {
  token: string;
  balanceDue: number;
  currency: string;
  canPayOnline: boolean;
  alreadyPaid: boolean;
};

export function InvoicePayButton({
  token,
  balanceDue,
  currency,
  canPayOnline,
  alreadyPaid,
}: InvoicePayButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
        toast.success("Payment received — thank you!");
        router.replace(`/view/invoices/${token}`);
        router.refresh();
      })();
    } else if (params.get("canceled") === "1") {
      toast.message("Checkout canceled");
      router.replace(`/view/invoices/${token}`);
    }
  }, [router, token]);

  if (alreadyPaid) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">
        This invoice is paid in full.
      </div>
    );
  }

  if (!canPayOnline || balanceDue <= 0) {
    return null;
  }

  async function startCheckout() {
    setLoading(true);
    try {
      const response = await fetch(`/api/public/invoices/${token}/checkout`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not start payment");
      }
      if (!data.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <Button
        type="button"
        size="lg"
        className="w-full cursor-pointer sm:w-auto"
        disabled={loading}
        onClick={() => void startCheckout()}
      >
        {loading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <CreditCardIcon className="size-4" />
        )}
        Pay {formatMoney(balanceDue, currency)}
      </Button>
      <p className="text-center text-xs text-muted-foreground sm:text-right">
        Secure card payment · paid to the business via Stripe
      </p>
    </div>
  );
}
