import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink } from "@/components/app-shell/page-header";
import { NotificationPreferencesPageContent } from "@/features/settings/components/notification-preferences-section";
import { requireMember } from "@/lib/auth";

export default async function NotificationPreferencesPage() {
  await requireMember();

  return (
    <PageScroll maxWidth="4xl">
      <PageBackLink href="/settings">Back to settings</PageBackLink>
      <NotificationPreferencesPageContent />
    </PageScroll>
  );
}
