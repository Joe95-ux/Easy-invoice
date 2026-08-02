import { prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";
import {
  companyConnectUpdateFromAccount,
  connectStatusFromAccount,
  isStripeConfigured,
  stripe,
  type ConnectAccountStatus,
} from "@/lib/stripe";

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
    return {
      accountId: null,
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      readyForPayments: false,
    };
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
  } catch {
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
    return company.stripeConnectedAccountId;
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
  const link = await stripe.accountLinks.create({
    account: input.accountId,
    refresh_url: `${origin}/settings?stripe=refresh#settings-stripe`,
    return_url: `${origin}/settings?stripe=return#settings-stripe`,
    type: "account_onboarding",
  });
  return link.url;
}

export async function createConnectLoginLink(accountId: string): Promise<string> {
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}
