"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { billingButtonClassName } from "@/features/settings/lib/billing-ui";
import { cn } from "@/lib/utils";

type BillingCheckoutButtonProps = {
  label?: string;
  interval?: "monthly" | "yearly";
  disabled?: boolean;
  className?: string;
  variant?: "default" | "outline";
};

export function BillingCheckoutButton({
  label = "Upgrade to Pro",
  interval = "monthly",
  disabled,
  className,
  variant = "default",
}: BillingCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function run() {
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
    <Button
      type="button"
      variant={variant}
      className={cn(billingButtonClassName, className)}
      disabled={disabled || loading}
      onClick={() => void run()}
    >
      {loading ? <Loader2Icon className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}
