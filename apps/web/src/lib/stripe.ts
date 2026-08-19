import Stripe from "stripe";

function createStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return Reflect.get(createStripeClient(), prop);
  },
});

export const PLANS = {
  FREE: { name: "Free", invoicesPerMonth: 20 },
  PRO: { name: "Pro", invoicesPerMonth: Infinity },
  BUSINESS: { name: "Business", invoicesPerMonth: Infinity },
  SCALE: { name: "Scale", invoicesPerMonth: Infinity },
} as const;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export const INVOICE_CHECKOUT_META_TYPE = "invoice_payment";

export type ConnectAccountStatus = {
  accountId: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  readyForPayments: boolean;
};

export function connectStatusFromAccount(
  account: Stripe.Account | null | undefined,
): Omit<ConnectAccountStatus, "accountId"> & { accountId: string | null } {
  if (!account) {
    return {
      accountId: null,
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      readyForPayments: false,
    };
  }

  const detailsSubmitted = Boolean(account.details_submitted);
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);

  return {
    accountId: account.id,
    detailsSubmitted,
    chargesEnabled,
    payoutsEnabled,
    readyForPayments: chargesEnabled && detailsSubmitted,
  };
}

/** Persist Connect capability flags from a Stripe Account object. */
export function companyConnectUpdateFromAccount(account: Stripe.Account) {
  const status = connectStatusFromAccount(account);
  return {
    stripeConnectedAccountId: account.id,
    stripeConnectDetailsSubmitted: status.detailsSubmitted,
    stripeConnectChargesEnabled: status.chargesEnabled,
    stripeConnectPayoutsEnabled: status.payoutsEnabled,
  };
}
