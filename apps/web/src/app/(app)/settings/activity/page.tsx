import { ActivityLogPageContent } from "@/features/settings/components/company-activity-log";
import { DEFAULT_ACTIVITY_DATE_RANGE } from "@/features/settings/components/activity-date-range-picker";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink } from "@/components/app-shell/page-header";
import { requireCompanyAdmin } from "@/lib/auth";
import { listAuditEvents } from "@/lib/audit/service";

export default async function SettingsActivityPage() {
  const member = await requireCompanyAdmin();
  const range = DEFAULT_ACTIVITY_DATE_RANGE;
  const result = await listAuditEvents({
    companyId: member.companyId,
    from: range.from,
    to: range.to,
    page: 1,
    pageSize: 25,
  });

  return (
    <PageScroll>
      <PageBackLink href="/settings/general">Back to settings</PageBackLink>
      <ActivityLogPageContent
        initialEvents={result.events}
        initialTotalCount={result.totalCount}
        initialPage={result.page}
        initialPageSize={result.pageSize}
        initialPageCount={result.pageCount}
      />
    </PageScroll>
  );
}
