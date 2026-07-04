import Link from "next/link";
import {
  CompanyActivityLog,
  ActivityLogInfoPopover,
} from "@/features/settings/components/company-activity-log";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
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
      <PageHeader
        title="Activity log"
        titleAddon={
          <span className="hidden sm:inline-flex">
            <ActivityLogInfoPopover />
          </span>
        }
        description={
          <span className="sm:hidden">
            Company-wide audit trail for team changes, settings updates, and deleted records.
          </span>
        }
        actions={
          <Button
            variant="outline"
            className={pageHeaderActionClass}
            render={<Link href="/settings" />}
          >
            Settings
          </Button>
        }
      />
      <CompanyActivityLog initialEvents={events} initialCursor={nextCursor} />
    </PageScroll>
  );
}
