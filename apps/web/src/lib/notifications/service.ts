import "server-only";
import type { NotificationType } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import { getPusher, memberChannel } from "@/lib/pusher";
import { getBeamsClient, beamsUserInterest } from "@/lib/pusher-beams";
import { NOTIFICATION_TYPE_TO_PREF } from "@/lib/notifications/types";

type CreateNotificationInput = {
  companyId: string;
  recipientMemberIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
};

export async function createNotification(input: CreateNotificationInput) {
  if (input.recipientMemberIds.length === 0) return;

  const prefField = NOTIFICATION_TYPE_TO_PREF[input.type];

  const recipients = await prisma.companyMember.findMany({
    where: {
      id: { in: input.recipientMemberIds },
      companyId: input.companyId,
      [prefField]: true,
    },
    select: { id: true },
  });

  if (recipients.length === 0) return;

  const notifications = await prisma.$transaction(
    recipients.map((recipient) =>
      prisma.notification.create({
        data: {
          companyId: input.companyId,
          memberId: recipient.id,
          type: input.type,
          title: input.title,
          body: input.body,
          linkUrl: input.linkUrl ?? null,
          metadata: input.metadata ?? undefined,
        },
      }),
    ),
  );

  const pusher = getPusher();
  if (pusher) {
    const payload = {
      type: input.type,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl ?? null,
    };

    await Promise.allSettled(
      notifications.map((n) =>
        pusher.trigger(memberChannel(n.memberId), "notification", {
          id: n.id,
          ...payload,
          createdAt: n.createdAt.toISOString(),
        }),
      ),
    );
  }

  const beams = await getBeamsClient();
  if (beams) {
    await Promise.allSettled(
      recipients.map((r) =>
        beams.publishToInterests([beamsUserInterest(r.id)], {
          web: {
            notification: {
              title: input.title,
              body: input.body,
              deep_link: input.linkUrl ?? undefined,
            },
          },
        }),
      ),
    );
  }

  return notifications;
}

export async function listNotifications(
  memberId: string,
  options?: { limit?: number; cursor?: string },
) {
  const limit = options?.limit ?? 20;

  const notifications = await prisma.notification.findMany({
    where: {
      memberId,
      ...(options?.cursor ? { createdAt: { lt: new Date(options.cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore ? items[items.length - 1]!.createdAt.toISOString() : null;

  return {
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      linkUrl: n.linkUrl,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function markNotificationsRead(memberId: string, notificationIds?: string[]) {
  if (notificationIds && notificationIds.length > 0) {
    await prisma.notification.updateMany({
      where: { memberId, id: { in: notificationIds } },
      data: { read: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { memberId, read: false },
      data: { read: true },
    });
  }
}

export async function getUnreadCount(memberId: string): Promise<number> {
  return prisma.notification.count({
    where: { memberId, read: false },
  });
}
