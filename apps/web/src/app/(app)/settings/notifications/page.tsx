import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { NotificationPreferencesSection } from "@/features/settings/components/notification-preferences-section";
import { requireMember } from "@/lib/auth";

export default async function NotificationPreferencesPage() {
  await requireMember();

  return (
    <PageScroll maxWidth="4xl">
      <PageHeader
        title="Notification preferences"
        description="Control which events trigger notifications for your account."
        actions={
          <Button
            variant="outline"
            className={pageHeaderActionClass}
            render={<Link href="/settings" />}
          >
            <ChevronLeftIcon className="size-4" />
            Settings
          </Button>
        }
      />

      <NotificationPreferencesSection />
    </PageScroll>
  );
}
