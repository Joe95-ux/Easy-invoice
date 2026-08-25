import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { BillingCurrentPlanCard } from "@/features/settings/components/billing-current-plan-card";
import { BillingInvoicesCard } from "@/features/settings/components/billing-invoices-card";
import { BillingUpgradeCard } from "@/features/settings/components/billing-upgrade-card";
import { StripeConnectSection } from "@/features/settings/components/stripe-connect-section";
import { requireCompanyAdmin } from "@/lib/auth";
import { getCompanyUsage } from "@/lib/billing/entitlements";
import { isStripeConfigured } from "@/lib/stripe";
import {
  getProPriceId,
  getProTrialDays,
  getSubscriptionBillingState,
  isPaidPlan,
  isSubscriptionBillingConfigured,
} from "@/lib/stripe-billing";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { billingButtonClassName } from "@/features/settings/lib/billing-ui";
import { cn } from "@/lib/utils";

export default async function SettingsBillingPage() {
  const member = await requireCompanyAdmin();
  const { company } = member;
  const paid = isPaidPlan(company.plan);
  const [usage, subscription] = await Promise.all([
    getCompanyUsage(company.id, company.plan),
    getSubscriptionBillingState(company.stripeSubscriptionId),
  ]);

  return (
    <PageScroll maxWidth="50rem">
      <PageHeader
        title="Billing"
        description="Plan, card payments, and Invoice Desk invoices."
        actions={
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "cursor-pointer text-muted-foreground hover:text-foreground",
              billingButtonClassName,
            )}
            render={<Link href="/settings/billing/plans" />}
          >
            All plans
            <ChevronRightIcon className="size-3.5 opacity-70" />
          </Button>
        }
      />

      <div className="space-y-6">
        <BillingCurrentPlanCard
          plan={company.plan}
          hasCustomer={Boolean(company.stripeCustomerId)}
          hasSubscription={Boolean(company.stripeSubscriptionId)}
          billingConfigured={isSubscriptionBillingConfigured()}
          hasYearlyPrice={Boolean(getProPriceId("yearly"))}
          billingInterval={subscription?.interval ?? "monthly"}
          subscriptionStatus={subscription?.status ?? null}
          cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
          usage={usage}
        />

        {!paid ? (
          <BillingUpgradeCard
            billingConfigured={isSubscriptionBillingConfigured()}
            hasYearlyPrice={Boolean(getProPriceId("yearly"))}
            trialDays={getProTrialDays()}
          />
        ) : null}

        <StripeConnectSection
          stripeConfigured={isStripeConfigured()}
          clientPaymentPlansEnabled={company.clientPaymentPlansEnabled}
          initialStatus={{
            accountId: company.stripeConnectedAccountId,
            detailsSubmitted: company.stripeConnectDetailsSubmitted,
            chargesEnabled: company.stripeConnectChargesEnabled,
            payoutsEnabled: company.stripeConnectPayoutsEnabled,
            readyForPayments:
              company.stripeConnectChargesEnabled && company.stripeConnectDetailsSubmitted,
          }}
        />

        <BillingInvoicesCard hasCustomer={Boolean(company.stripeCustomerId)} />
      </div>
    </PageScroll>
  );
}
