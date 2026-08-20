import { prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";
import {
  companyConnectUpdateFromAccount,
  connectStatusFromAccount,
  isStripeConfigured,
  stripe,
  type ConnectAccountStatus,
} from "@/lib/stripe";

const EMPTY_CONNECT_STATUS: ConnectAccountStatus = {
  accountId: null,
  detailsSubmitted: false,
  chargesEnabled: false,
  payoutsEnabled: false,
  readyForPayments: false,
};

async function clearStaleConnectedAccount(companyId: string) {
  await prisma.company.update({
    where: { id: companyId },
    data: {
      stripeConnectedAccountId: null,
      stripeConnectDetailsSubmitted: false,
      stripeConnectChargesEnabled: false,
      stripeConnectPayoutsEnabled: false,
    },
  });
}

/** True when Stripe says the connected account is missing / not on this platform. */
function isStaleConnectedAccountError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    code?: string;
    type?: string;
    message?: string;
    statusCode?: number;
  };
  const message = (err.message ?? "").toLowerCase();
  return (
    err.code === "resource_missing" ||
    message.includes("no such account") ||
    message.includes("not connected to your platform") ||
    message.includes("does not exist")
  );
}

export async function getCompanyConnectStatus(
  companyId: string,
): Promise<ConnectAccountStatus> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      stripeConnectedAccountId: true,
      stripeConnectChargesEnabled: true,
      stripeConnectDetailsSubmitted: true,
      stripeConnectPayoutsEnabled: true,
    },
  });

  if (!company?.stripeConnectedAccountId) {
    return EMPTY_CONNECT_STATUS;
  }

  if (!isStripeConfigured()) {
    return {
      accountId: company.stripeConnectedAccountId,
      detailsSubmitted: company.stripeConnectDetailsSubmitted,
      chargesEnabled: company.stripeConnectChargesEnabled,
      payoutsEnabled: company.stripeConnectPayoutsEnabled,
      readyForPayments:
        company.stripeConnectChargesEnabled && company.stripeConnectDetailsSubmitted,
    };
  }

  try {
    const account = await stripe.accounts.retrieve(company.stripeConnectedAccountId);
    const update = companyConnectUpdateFromAccount(account);
    await prisma.company.update({
      where: { id: companyId },
      data: {
        stripeConnectDetailsSubmitted: update.stripeConnectDetailsSubmitted,
        stripeConnectChargesEnabled: update.stripeConnectChargesEnabled,
        stripeConnectPayoutsEnabled: update.stripeConnectPayoutsEnabled,
      },
    });
    return connectStatusFromAccount(account);
  } catch (error) {
    if (isStaleConnectedAccountError(error)) {
      await clearStaleConnectedAccount(companyId);
      return EMPTY_CONNECT_STATUS;
    }
    return {
      accountId: company.stripeConnectedAccountId,
      detailsSubmitted: company.stripeConnectDetailsSubmitted,
      chargesEnabled: company.stripeConnectChargesEnabled,
      payoutsEnabled: company.stripeConnectPayoutsEnabled,
      readyForPayments:
        company.stripeConnectChargesEnabled && company.stripeConnectDetailsSubmitted,
    };
  }
}

export async function ensureConnectedExpressAccount(input: {
  companyId: string;
  country: string;
  email?: string | null;
}): Promise<string> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: input.companyId },
    select: { stripeConnectedAccountId: true },
  });

  if (company.stripeConnectedAccountId) {
    try {
      await stripe.accounts.retrieve(company.stripeConnectedAccountId);
      return company.stripeConnectedAccountId;
    } catch (error) {
      if (!isStaleConnectedAccountError(error)) throw error;
      // Connected account was created under a different platform / deleted.
      await clearStaleConnectedAccount(input.companyId);
    }
  }

  const account = await stripe.accounts.create({
    type: "express",
    country: (input.country || "US").slice(0, 2).toUpperCase(),
    email: input.email?.trim() || undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      product_description: "Invoices and estimates for clients",
    },
    metadata: {
      companyId: input.companyId,
    },
  });

  await prisma.company.update({
    where: { id: input.companyId },
    data: companyConnectUpdateFromAccount(account),
  });

  return account.id;
}

export async function createConnectOnboardingLink(input: {
  companyId: string;
  accountId: string;
}): Promise<string> {
  const origin = await getAppOrigin();
  try {
    const link = await stripe.accountLinks.create({
      account: input.accountId,
      refresh_url: `${origin}/settings/billing?stripe=refresh`,
      return_url: `${origin}/settings/billing?stripe=return`,
      type: "account_onboarding",
    });
    return link.url;
  } catch (error) {
    if (!isStaleConnectedAccountError(error)) throw error;
    await clearStaleConnectedAccount(input.companyId);
    throw new Error(
      "Stripe Connect was reset for this company — click Connect Stripe again to start fresh",
    );
  }
}

export async function createConnectLoginLink(accountId: string): Promise<string> {
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}
