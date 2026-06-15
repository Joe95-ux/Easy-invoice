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
  FREE: { name: "Free", invoicesPerMonth: 5 },
  PRO: { name: "Pro", invoicesPerMonth: Infinity },
  BUSINESS: { name: "Business", invoicesPerMonth: Infinity },
  SCALE: { name: "Scale", invoicesPerMonth: Infinity },
} as const;
