import "server-only";

import { prisma } from "@/lib/db";
import { normalizePortalEmail } from "@/lib/portal/tokens";

export type MergeClientDuplicatesResult = {
  merged: boolean;
  survivorId: string;
  mergedIds: string[];
};

/**
 * Merge clients that share the same email within one company into a single survivor.
 * Reassigns invoices, estimates, recurring schedules, time, portal rows, then deletes losers.
 */
export async function mergeClientDuplicatesByEmail(input: {
  companyId: string;
  email: string;
  /** Prefer this client as survivor when it is in the duplicate set. */
  preferClientId?: string;
}): Promise<MergeClientDuplicatesResult | null> {
  const email = normalizePortalEmail(input.email);
  if (!email || !email.includes("@")) return null;

  const clients = await prisma.client.findMany({
    where: {
      companyId: input.companyId,
      email: { equals: email, mode: "insensitive" },
    },
    select: {
      id: true,
      updatedAt: true,
      _count: {
        select: {
          invoices: true,
          estimates: true,
          recurringInvoices: true,
        },
      },
    },
  });

  if (clients.length <= 1) {
    return clients[0]
      ? { merged: false, survivorId: clients[0].id, mergedIds: [] }
      : null;
  }

  const ranked = [...clients].sort((a, b) => {
    if (input.preferClientId) {
      if (a.id === input.preferClientId) return -1;
      if (b.id === input.preferClientId) return 1;
    }
    const aDocs = a._count.invoices + a._count.estimates + a._count.recurringInvoices;
    const bDocs = b._count.invoices + b._count.estimates + b._count.recurringInvoices;
    if (bDocs !== aDocs) return bDocs - aDocs;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const survivor = ranked[0]!;
  const losers = ranked.slice(1);
  const loserIds = losers.map((row) => row.id);

  await prisma.$transaction(async (tx) => {
    await tx.invoice.updateMany({
      where: { companyId: input.companyId, clientId: { in: loserIds } },
      data: { clientId: survivor.id },
    });
    await tx.estimate.updateMany({
      where: { companyId: input.companyId, clientId: { in: loserIds } },
      data: { clientId: survivor.id },
    });
    await tx.recurringInvoice.updateMany({
      where: { companyId: input.companyId, clientId: { in: loserIds } },
      data: { clientId: survivor.id },
    });
    await tx.timeEntry.updateMany({
      where: { companyId: input.companyId, clientId: { in: loserIds } },
      data: { clientId: survivor.id },
    });
    await tx.activeTimeTimer.updateMany({
      where: { companyId: input.companyId, clientId: { in: loserIds } },
      data: { clientId: survivor.id },
    });
    await tx.followUp.updateMany({
      where: { companyId: input.companyId, clientId: { in: loserIds } },
      data: { clientId: survivor.id },
    });
    await tx.clientPortalMagicLink.updateMany({
      where: { clientId: { in: loserIds } },
      data: { clientId: survivor.id },
    });
    await tx.clientPortalSession.updateMany({
      where: { clientId: { in: loserIds } },
      data: { clientId: survivor.id },
    });
    await tx.clientPortalEvent.updateMany({
      where: { clientId: { in: loserIds } },
      data: { clientId: survivor.id },
    });

    // Prefer survivor contact fields when losers have data survivor lacks.
    const full = await tx.client.findMany({
      where: { id: { in: [survivor.id, ...loserIds] } },
    });
    const survivorRow = full.find((row) => row.id === survivor.id);
    if (survivorRow) {
      const patch: Record<string, string | null> = {};
      for (const field of ["phone", "address", "city", "state", "zip", "notes"] as const) {
        if (!survivorRow[field]) {
          const fromLoser = full.find((row) => row.id !== survivor.id && row[field]);
          if (fromLoser?.[field]) patch[field] = fromLoser[field];
        }
      }
      if (Object.keys(patch).length > 0) {
        await tx.client.update({ where: { id: survivor.id }, data: patch });
      }
    }

    await tx.client.deleteMany({
      where: { id: { in: loserIds }, companyId: input.companyId },
    });
  });

  return {
    merged: true,
    survivorId: survivor.id,
    mergedIds: loserIds,
  };
}

/** Merge all duplicate email groups inside a company. */
export async function mergeAllClientEmailDuplicates(
  companyId: string,
): Promise<{ groupsMerged: number; clientsRemoved: number }> {
  const clients = await prisma.client.findMany({
    where: {
      companyId,
      email: { not: null },
    },
    select: { email: true },
  });

  const emails = new Set(
    clients
      .map((row) => (row.email ? normalizePortalEmail(row.email) : ""))
      .filter((email) => email.includes("@")),
  );

  let groupsMerged = 0;
  let clientsRemoved = 0;

  for (const email of emails) {
    const result = await mergeClientDuplicatesByEmail({ companyId, email });
    if (result?.merged) {
      groupsMerged += 1;
      clientsRemoved += result.mergedIds.length;
    }
  }

  return { groupsMerged, clientsRemoved };
}
