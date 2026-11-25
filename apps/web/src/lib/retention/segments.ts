import type { RetentionSegment } from "@easy-invoice/db";
import { prisma } from "@/lib/db";

export const RETENTION_SEGMENT_LABEL: Record<RetentionSegment, string> = {
  PAID_CLIENTS: "Paid clients",
  INACTIVE_60: "Inactive 60+ days",
  OPEN_ESTIMATES: "Open estimates",
  ALL_REACHABLE: "All reachable",
};

export const RETENTION_SEGMENT_DESCRIPTION: Record<RetentionSegment, string> = {
  PAID_CLIENTS: "Clients with at least one fully paid invoice",
  INACTIVE_60: "Clients with email who have had no invoice activity in 60 days",
  OPEN_ESTIMATES: "Clients with a sent estimate that is still open",
  ALL_REACHABLE: "Every active client with email and marketing opt-in",
};

export const RETENTION_SEGMENTS = Object.keys(RETENTION_SEGMENT_LABEL) as RetentionSegment[];

export type RetentionAudienceClient = {
  id: string;
  name: string;
  email: string;
};

const INACTIVE_DAYS = 60;

function baseWhere(companyId: string) {
  return {
    companyId,
    archivedAt: null,
    marketingOptIn: true as const,
    // Exclude null and blank emails stored as "".
    AND: [{ email: { not: null } }, { email: { not: "" } }],
  };
}

/** Clients eligible for a retention segment (email + opt-in + not archived). */
export async function listRetentionAudience(
  companyId: string,
  segment: RetentionSegment,
): Promise<RetentionAudienceClient[]> {
  const whereBase = baseWhere(companyId);

  if (segment === "ALL_REACHABLE") {
    const rows = await prisma.client.findMany({
      where: whereBase,
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return toAudience(rows);
  }

  if (segment === "PAID_CLIENTS") {
    const rows = await prisma.client.findMany({
      where: {
        ...whereBase,
        invoices: { some: { status: "PAID" } },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return toAudience(rows);
  }

  if (segment === "OPEN_ESTIMATES") {
    const rows = await prisma.client.findMany({
      where: {
        ...whereBase,
        estimates: {
          some: {
            status: { in: ["SENT", "VIEWED"] },
            convertedInvoice: { is: null },
          },
        },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return toAudience(rows);
  }

  // INACTIVE_60 — no invoice created, issued, sent, or paid in the window.
  // Activity on any invoice counts, not only the newest one.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - INACTIVE_DAYS);

  const rows = await prisma.client.findMany({
    where: {
      ...whereBase,
      createdAt: { lt: cutoff },
      invoices: {
        none: {
          OR: [
            { createdAt: { gte: cutoff } },
            { issueDate: { gte: cutoff } },
            { sentAt: { gte: cutoff } },
            { paidAt: { gte: cutoff } },
          ],
        },
      },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return toAudience(rows);
}

function toAudience(
  rows: Array<{ id: string; name: string; email: string | null }>,
): RetentionAudienceClient[] {
  return rows.flatMap((row) => {
    const email = row.email?.trim();
    if (!email) return [];
    return [{ id: row.id, name: row.name, email }];
  });
}

export async function countRetentionSegments(companyId: string) {
  const entries = await Promise.all(
    RETENTION_SEGMENTS.map(async (segment) => {
      const audience = await listRetentionAudience(companyId, segment);
      return [segment, audience.length] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<RetentionSegment, number>;
}
