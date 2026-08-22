import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
import { BillingPlansComparison } from "@/features/settings/components/billing-plans-comparison";
import { requireMember } from "@/lib/auth";
import { canManageCompanySettings } from "@/lib/team";
import {
  getProPriceId,
  isSubscriptionBillingConfigured,
} from "@/lib/stripe-billing";

export default async function SettingsBillingPlansPage() {
  const member = await requireMember();
  const canManageBilling = canManageCompanySettings(member.role);

  return (
    <PageScroll maxWidth="60rem">
      {canManageBilling ? (
        <PageBackLink href="/settings/billing">Billing</PageBackLink>
      ) : null}
      <PageHeader title="Plans" className="mb-4" />
      <BillingPlansComparison
        currentPlan={member.company.plan}
        billingConfigured={isSubscriptionBillingConfigured()}
        hasYearlyPrice={Boolean(getProPriceId("yearly"))}
        canManageBilling={canManageBilling}
      />
    </PageScroll>
  );
}
