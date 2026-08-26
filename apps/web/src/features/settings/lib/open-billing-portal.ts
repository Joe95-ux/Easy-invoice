"use client";

/** Deep-link destinations inside the Stripe Customer Portal. */
export type BillingPortalFlow =
  | "payment_method_update"
  | "subscription_cancel"
  | "subscription_update";

const PORTAL_SNAPSHOT_KEY = "invoice_desk_billing_portal_snapshot";

export type BillingPortalSnapshot = {
  plan: string;
  hasSubscription: boolean;
  hasCustomer: boolean;
  isPaid: boolean;
  cancelAtPeriodEnd: boolean;
  subscriptionStatus: string | null;
};

function isBillingPortalSnapshot(value: unknown): value is BillingPortalSnapshot {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.plan === "string" &&
    typeof record.hasSubscription === "boolean" &&
    typeof record.hasCustomer === "boolean" &&
    typeof record.isPaid === "boolean" &&
    typeof record.cancelAtPeriodEnd === "boolean" &&
    (record.subscriptionStatus === null || typeof record.subscriptionStatus === "string")
  );
}

/** Save billing state before redirecting to the portal (compared on return). */
export function saveBillingPortalSnapshot(snapshot: BillingPortalSnapshot) {
  try {
    sessionStorage.setItem(PORTAL_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // private mode / blocked storage — ignore
  }
}

/** Read + clear snapshot taken before opening the portal. */
export function takeBillingPortalSnapshot(): BillingPortalSnapshot | null {
  try {
    const raw = sessionStorage.getItem(PORTAL_SNAPSHOT_KEY);
    sessionStorage.removeItem(PORTAL_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isBillingPortalSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchBillingSnapshot(): Promise<BillingPortalSnapshot | null> {
  try {
    const response = await fetch("/api/stripe/billing");
    if (!response.ok) return null;
    const data = (await response.json()) as unknown;
    return isBillingPortalSnapshot(data) ? data : null;
  } catch {
    return null;
  }
}

export function billingPortalSnapshotChanged(
  before: BillingPortalSnapshot,
  after: BillingPortalSnapshot,
): boolean {
  return (
    before.plan !== after.plan ||
    before.hasSubscription !== after.hasSubscription ||
    before.isPaid !== after.isPaid ||
    before.cancelAtPeriodEnd !== after.cancelAtPeriodEnd ||
    before.subscriptionStatus !== after.subscriptionStatus
  );
}

/**
 * Open the Stripe Customer Portal for the active company.
 * Redirects the browser on success; throws on failure (caller should toast).
 */
export async function openBillingPortal(flow?: BillingPortalFlow): Promise<void> {
  const snapshot = await fetchBillingSnapshot();
  if (snapshot) saveBillingPortalSnapshot(snapshot);

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
