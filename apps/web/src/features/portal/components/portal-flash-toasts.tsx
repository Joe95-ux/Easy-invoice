"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Show one-shot toasts when returning to the portal after pay / respond. */
export function PortalFlashToasts() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const paid = searchParams.get("paid") === "1";
    const canceled = searchParams.get("canceled") === "1";
    const estimateAccepted = searchParams.get("estimateAccepted") === "1";
    const estimateDeclined = searchParams.get("estimateDeclined") === "1";

    if (!paid && !canceled && !estimateAccepted && !estimateDeclined) return;

    if (paid) toast.success("Payment received — thank you!");
    else if (canceled) toast.message("Checkout canceled");
    else if (estimateAccepted) toast.success("Estimate signed and accepted");
    else if (estimateDeclined) toast.message("Estimate declined");

    router.replace("/portal");
  }, [router, searchParams]);

  return null;
}
