import { PageScroll } from "@/components/app-shell/app-shell";
import { AnalyticsPageContent } from "@/features/analytics/components/analytics-page-content";
import { requireCompanyAdmin } from "@/lib/auth";
import { getAnalyticsData } from "@/lib/analytics/service";

export default async function AnalyticsPage() {
  const member = await requireCompanyAdmin();
  const data = await getAnalyticsData(member.companyId);

  return (
    <PageScroll>
      <AnalyticsPageContent data={data} />
    </PageScroll>
  );
}
