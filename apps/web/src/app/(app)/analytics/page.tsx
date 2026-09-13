import { PageScroll } from "@/components/app-shell/app-shell";
import { AnalyticsPageContent } from "@/features/analytics/components/analytics-page-content";
import { requireCompanyAdmin } from "@/lib/auth";
import { parseAnalyticsPeriod } from "@/lib/analytics/period";
import { getAnalyticsData } from "@/lib/analytics/service";

type AnalyticsPageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const member = await requireCompanyAdmin();
  const params = await searchParams;
  const period = parseAnalyticsPeriod(params.period);
  const data = await getAnalyticsData(member.companyId, period);

  return (
    <PageScroll>
      <AnalyticsPageContent data={data} />
    </PageScroll>
  );
}
