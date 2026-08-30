import "server-only";

import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";

const PORTAL_NOTIFY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Record that a client opened/signed into the portal.
 * Notifies staff at most once per 24h per client (uses notifyClientViewed pref).
 */
export async function recordClientPortalOpened(clientId: string): Promise<void> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, companyId: true },
  });
  if (!client) return;

  const since = new Date(Date.now() - PORTAL_NOTIFY_COOLDOWN_MS);
  const recent = await prisma.clientPortalEvent.findFirst({
    where: {
      clientId: client.id,
      kind: "OPENED",
      createdAt: { gte: since },
    },
    select: { id: true },
  });

  await prisma.clientPortalEvent.create({
    data: {
      clientId: client.id,
      companyId: client.companyId,
      kind: "OPENED",
    },
  });

  if (recent) return;

  const memberIds = (
    await prisma.companyMember.findMany({
      where: { companyId: client.companyId },
      select: { id: true },
    })
  ).map((m) => m.id);

  if (memberIds.length === 0) return;

  await createNotification({
    companyId: client.companyId,
    recipientMemberIds: memberIds,
    type: "CLIENT_PORTAL_OPENED",
    title: `${client.name} opened the client portal`,
    body: `${client.name} signed in to view invoices and estimates`,
    linkUrl: `/clients/${client.id}`,
  }).catch(() => undefined);
}
