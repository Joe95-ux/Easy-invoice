import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
import { BillingPlansComparison } from "@/features/settings/components/billing-plans-comparison";
import { requireCompanyAdmin } from "@/lib/auth";
import {
  getProPriceId,
  isSubscriptionBillingConfigured,
} from "@/lib/stripe-billing";

export default async function SettingsBillingPlansPage() {
  const member = await requireCompanyAdmin();

  return (
    <PageScroll maxWidth="60rem">
      <PageBackLink href="/settings/billing">Billing</PageBackLink>
      <PageHeader title="Plans" className="mb-4" />
      <BillingPlansComparison
        currentPlan={member.company.plan}
        billingConfigured={isSubscriptionBillingConfigured()}
        hasYearlyPrice={Boolean(getProPriceId("yearly"))}
      />
    </PageScroll>
  );
}
