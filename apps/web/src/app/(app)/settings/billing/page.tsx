import { BillingSettingsSection } from "@/features/settings/components/billing-settings-section";
import { StripeConnectSection } from "@/features/settings/components/stripe-connect-section";
import { requireCompanyAdmin } from "@/lib/auth";
import { isStripeConfigured } from "@/lib/stripe";
import {
  getProPriceId,
  getProTrialDays,
  isSubscriptionBillingConfigured,
} from "@/lib/stripe-billing";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function SettingsBillingPage() {
  const member = await requireCompanyAdmin();
  const { company } = member;

  return (
    <PageScroll maxWidth="50rem">
      <PageHeader
        title="Billing"
        description="Your Invoice Desk plan and how clients pay invoices by card."
      />

      <div className="space-y-8">
        <BillingSettingsSection
          plan={company.plan}
          hasSubscription={Boolean(company.stripeSubscriptionId)}
          billingConfigured={isSubscriptionBillingConfigured()}
          hasYearlyPrice={Boolean(getProPriceId("yearly"))}
          trialDays={getProTrialDays()}
        />

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
      </div>
    </PageScroll>
  );
}
