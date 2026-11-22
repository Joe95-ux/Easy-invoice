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
    marketingOptIn: true,
    email: { not: null },
  } as const;
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
    return rows.filter((row): row is RetentionAudienceClient => Boolean(row.email));
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
    return rows.filter((row): row is RetentionAudienceClient => Boolean(row.email));
  }

  if (segment === "OPEN_ESTIMATES") {
    const rows = await prisma.client.findMany({
      where: {
        ...whereBase,
        estimates: {
          some: {
            status: { in: ["SENT", "VIEWED"] },
            convertedInvoiceId: null,
          },
        },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return rows.filter((row): row is RetentionAudienceClient => Boolean(row.email));
  }

  // INACTIVE_60 — no invoice created/sent/paid in the window
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - INACTIVE_DAYS);

  const candidates = await prisma.client.findMany({
    where: whereBase,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      invoices: {
        select: { issueDate: true, sentAt: true, paidAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return candidates
    .filter((client) => {
      if (!client.email) return false;
      const latest = client.invoices[0];
      if (!latest) return client.createdAt < cutoff;
      const stamps = [latest.createdAt, latest.issueDate, latest.sentAt, latest.paidAt].filter(
        (d): d is Date => d instanceof Date,
      );
      const mostRecent = stamps.reduce((max, d) => (d > max ? d : max), stamps[0]!);
      return mostRecent < cutoff;
    })
    .map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email!,
    }));
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
