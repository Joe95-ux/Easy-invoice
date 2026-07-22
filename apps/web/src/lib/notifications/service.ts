import "server-only";
import { Prisma, type NotificationType } from "@easy-invoice/db";
import { getAppOrigin } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { isEmailConfigured, sendTeamNotificationEmail } from "@/lib/email";
import { resolveMemberLoginEmails } from "@/lib/member-email";
import { getPusher, memberChannel } from "@/lib/pusher";
import { getBeamsClient, beamsUserInterest } from "@/lib/pusher-beams";
import { NOTIFICATION_TYPE_TO_PREF } from "@/lib/notifications/types";

/** Notification types that also email team members (respecting prefs). */
const EMAIL_NOTIFICATION_TYPES = new Set<NotificationType>([
  "ESTIMATE_ACCEPTED",
  "ESTIMATE_DECLINED",
]);

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
    select: { id: true, clerkId: true, email: true },
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
          metadata: input.metadata
            ? (input.metadata as Prisma.InputJsonValue)
            : undefined,
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

  if (EMAIL_NOTIFICATION_TYPES.has(input.type) && isEmailConfigured()) {
    void sendNotificationEmails({
      companyId: input.companyId,
      recipients,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl,
    });
  }

  return notifications;
}

async function sendNotificationEmails(input: {
  companyId: string;
  recipients: Array<{ id: string; clerkId: string; email: string }>;
  title: string;
  body: string;
  linkUrl?: string;
}) {
  try {
    const [company, withEmails, origin] = await Promise.all([
      prisma.company.findUnique({
        where: { id: input.companyId },
        select: { name: true },
      }),
      resolveMemberLoginEmails(input.recipients),
      getAppOrigin(),
    ]);
    if (!company) return;

    const emails = [
      ...new Set(
        withEmails
          .map((m) => m.email.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    if (emails.length === 0) return;

    const absoluteLink = input.linkUrl
      ? input.linkUrl.startsWith("http")
        ? input.linkUrl
        : `${origin}${input.linkUrl.startsWith("/") ? "" : "/"}${input.linkUrl}`
      : null;

    await sendTeamNotificationEmail({
      to: emails,
      companyName: company.name,
      title: input.title,
      body: input.body,
      linkUrl: absoluteLink,
    });
  } catch {
    // In-app notification already succeeded
  }
}

export async function listNotifications(
  memberId: string,
  options?: {
    limit?: number;
    cursor?: string;
    page?: number;
    pageSize?: number;
    read?: "all" | "read" | "unread";
    type?: NotificationType;
  },
) {
  const where = {
    memberId,
    ...(options?.read === "read"
      ? { read: true }
      : options?.read === "unread"
        ? { read: false }
        : {}),
    ...(options?.type ? { type: options.type } : {}),
    ...(options?.cursor ? { createdAt: { lt: new Date(options.cursor) } } : {}),
  };

  if (options?.page && options?.pageSize) {
    const skip = (options.page - 1) * options.pageSize;
    const [rows, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: options.pageSize,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications: rows.map(mapNotification),
      totalCount,
      nextCursor: null,
    };
  }

  const limit = options?.limit ?? 20;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, limit) : notifications;
  const nextCursor = hasMore ? items[items.length - 1]!.createdAt.toISOString() : null;
  const totalCount = await prisma.notification.count({ where: { memberId } });

  return {
    notifications: items.map(mapNotification),
    totalCount,
    nextCursor,
  };
}

function mapNotification(n: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl: string | null;
  read: boolean;
  createdAt: Date;
}) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    linkUrl: n.linkUrl,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function setNotificationRead(
  memberId: string,
  notificationId: string,
  read: boolean,
) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, memberId },
    data: { read },
  });
  return result.count > 0;
}

export async function deleteNotification(memberId: string, notificationId: string) {
  const result = await prisma.notification.deleteMany({
    where: { id: notificationId, memberId },
  });
  return result.count > 0;
}

export async function deleteReadNotifications(memberId: string) {
  return prisma.notification.deleteMany({
    where: { memberId, read: true },
  });
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
