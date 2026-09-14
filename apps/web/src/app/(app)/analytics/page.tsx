import { PageScroll } from "@/components/app-shell/app-shell";
import { AnalyticsPageContent } from "@/features/analytics/components/analytics-page-content";
import { requireCompanyAdmin } from "@/lib/auth";
import { resolveAnalyticsRange } from "@/lib/analytics/period";
import { getAnalyticsData } from "@/lib/analytics/service";

type AnalyticsPageProps = {
  searchParams: Promise<{
    preset?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const member = await requireCompanyAdmin();
  const params = await searchParams;
  const range = resolveAnalyticsRange({
    preset: params.preset,
    from: params.from,
    to: params.to,
  });
  const data = await getAnalyticsData(member.companyId, range);

  return (
    <PageScroll>
      <AnalyticsPageContent data={data} />
    </PageScroll>
  );
}
