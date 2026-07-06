import { ActivityLogPageContent } from "@/features/settings/components/company-activity-log";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink } from "@/components/app-shell/page-header";
import { requireCompanyAdmin } from "@/lib/auth";
import { listAuditEvents } from "@/lib/audit/service";

export default async function SettingsActivityPage() {
  const member = await requireCompanyAdmin();
  const { events, nextCursor } = await listAuditEvents({
    companyId: member.companyId,
    limit: 50,
  });

  return (
    <PageScroll>
      <PageBackLink href="/settings">Back to settings</PageBackLink>
      <ActivityLogPageContent initialEvents={events} initialCursor={nextCursor} />
    </PageScroll>
  );
}
