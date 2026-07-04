import { PageScroll } from "@/components/app-shell/app-shell";
import { NotificationsPageContent } from "@/features/notifications/components/notifications-page-content";
import { requireMember } from "@/lib/auth";
import { getUnreadCount, listNotifications } from "@/lib/notifications/service";

export default async function NotificationsPage() {
  const member = await requireMember();

  const [{ notifications, totalCount }, unreadCount] = await Promise.all([
    listNotifications(member.id, { page: 1, pageSize: 20 }),
    getUnreadCount(member.id),
  ]);

  return (
    <PageScroll>
      <NotificationsPageContent
        initialNotifications={notifications}
        initialTotalCount={totalCount}
        initialUnreadCount={unreadCount}
      />
    </PageScroll>
  );
}
