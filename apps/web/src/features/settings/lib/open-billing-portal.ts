"use client";

/** Deep-link destinations inside the Stripe Customer Portal. */
export type BillingPortalFlow =
  | "payment_method_update"
  | "subscription_cancel"
  | "subscription_update";

/**
 * Open the Stripe Customer Portal for the active company.
 * Redirects the browser on success; throws on failure (caller should toast).
 */
export async function openBillingPortal(flow?: BillingPortalFlow): Promise<void> {
  const response = await fetch("/api/stripe/billing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "portal",
      ...(flow ? { flow } : {}),
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    url?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "Could not open billing portal");
  }
  if (!data.url) {
    throw new Error("No portal URL returned");
  }
  window.location.href = data.url;
}
