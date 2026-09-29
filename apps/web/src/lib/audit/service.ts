import { Prisma, type AuditAction, type AuditCategory } from "@easy-invoice/db";
import { endOfDay, parseISO, startOfDay, isValid } from "date-fns";
import { prisma } from "@/lib/db";
import { formatRevisionActor, resolveMemberProfile } from "@/lib/member-email";
import { notifyAuditAlert } from "./alerts";
import { DEFAULT_AUDIT_PAGE_SIZE, MAX_AUDIT_PAGE_SIZE } from "./constants";
import type { AuditEventListItem, RecordAuditEventInput } from "./types";

const MAX_EXPORT_ROWS = 5000;

type AuditDateRange = {
  from?: string | null;
  to?: string | null;
};

type ListAuditEventsInput = {
  companyId: string;
  category?: AuditCategory;
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
};

function parseDateBound(value: string | null | undefined, end: boolean): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  if (!isValid(parsed)) return null;
  return end ? endOfDay(parsed) : startOfDay(parsed);
}

function buildCreatedAtFilter(range: AuditDateRange): Prisma.DateTimeFilter | undefined {
  const gte = parseDateBound(range.from, false);
  const lte = parseDateBound(range.to, true);
  if (!gte && !lte) return undefined;
  return {
    ...(gte ? { gte } : {}),
    ...(lte ? { lte } : {}),
  };
}

async function resolveActorMetadata(memberId?: string | null) {
  if (!memberId) return {};
  const member = await prisma.companyMember.findUnique({
    where: { id: memberId },
    select: { id: true, clerkId: true, email: true, name: true },
  });
  if (!member) return {};
  const profile = await resolveMemberProfile(member);
  return {
    actorName: profile.name,
    actorEmail: profile.email,
  };
}

export async function recordAuditEvent(input: RecordAuditEventInput) {
  const actorMetadata = await resolveActorMetadata(input.memberId);
  const metadata = {
    ...(input.metadata ?? {}),
    ...actorMetadata,
  } satisfies Record<string, unknown>;

  const event = await prisma.auditEvent.create({
    data: {
      companyId: input.companyId,
      memberId: input.memberId ?? null,
      category: input.category,
      action: input.action,
      summary: input.summary,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: Object.keys(metadata).length > 0 ? (metadata as Prisma.InputJsonValue) : undefined,
    },
  });

  void notifyAuditAlert({
    companyId: input.companyId,
    actorMemberId: input.memberId,
    action: input.action,
    summary: input.summary,
    actorName: typeof metadata.actorName === "string" ? metadata.actorName : null,
    actorEmail: typeof metadata.actorEmail === "string" ? metadata.actorEmail : null,
    createdAt: event.createdAt,
  }).catch((error) => {
    console.error("Audit alert email failed:", error);
  });

  return event;
}

/**
 * Record a member sign-in once per Clerk session (deduped by sessionId).
 */
export async function recordMemberSignIn(input: {
  companyId: string;
  memberId: string;
  sessionId: string;
}) {
  const sessionId = input.sessionId.trim();
  if (!sessionId) return null;

  const existing = await prisma.auditEvent.findFirst({
    where: {
      companyId: input.companyId,
      memberId: input.memberId,
      action: "MEMBER_SIGNED_IN",
      metadata: { path: ["sessionId"], equals: sessionId },
    },
    select: { id: true },
  });
  if (existing) return existing;

  return recordAuditEvent({
    companyId: input.companyId,
    memberId: input.memberId,
    category: "AUTH",
    action: "MEMBER_SIGNED_IN",
    summary: "Signed in",
    entityType: "session",
    entityId: sessionId,
    metadata: { sessionId },
  });
}

function toListItem(event: {
  id: string;
  category: AuditCategory;
  action: AuditAction;
  summary: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  member: { name: string | null; email: string } | null;
}): AuditEventListItem {
  const metadata =
    event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : {};

  const actorLabel =
    formatRevisionActor(
      typeof metadata.actorName === "string" ? metadata.actorName : (event.member?.name ?? null),
      typeof metadata.actorEmail === "string"
        ? metadata.actorEmail
        : (event.member?.email ?? null),
    ) ?? "Unknown";

  return {
    id: event.id,
    category: event.category,
    action: event.action,
    summary: event.summary,
    entityType: event.entityType,
    entityId: event.entityId,
    metadata,
    createdAt: event.createdAt.toISOString(),
    actorLabel,
  };
}

function listWhere(input: {
  companyId: string;
  category?: AuditCategory;
  from?: string | null;
  to?: string | null;
}): Prisma.AuditEventWhereInput {
  const createdAt = buildCreatedAtFilter({ from: input.from, to: input.to });
  return {
    companyId: input.companyId,
    ...(input.category ? { category: input.category } : {}),
    ...(createdAt ? { createdAt } : {}),
  };
}

export async function listAuditEvents(input: ListAuditEventsInput) {
  const pageSize = Math.min(
    Math.max(input.pageSize ?? DEFAULT_AUDIT_PAGE_SIZE, 1),
    MAX_AUDIT_PAGE_SIZE,
  );
  const page = Math.max(input.page ?? 1, 1);
  const where = listWhere(input);

  const [totalCount, events] = await Promise.all([
    prisma.auditEvent.count({ where }),
    prisma.auditEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        member: {
          select: { name: true, email: true },
        },
      },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, pageCount);
  // If page was past the end (e.g. after filter change), refetch last page.
  if (safePage !== page && totalCount > 0) {
    const retry = await prisma.auditEvent.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      include: {
        member: {
          select: { name: true, email: true },
        },
      },
    });
    return {
      events: retry.map(toListItem),
      totalCount,
      page: safePage,
      pageSize,
      pageCount,
    };
  }

  return {
    events: events.map(toListItem),
    totalCount,
    page: safePage,
    pageSize,
    pageCount,
  };
}

export async function listAuditEventsForExport(
  companyId: string,
  options?: { category?: AuditCategory; from?: string | null; to?: string | null },
) {
  const events = await prisma.auditEvent.findMany({
    where: listWhere({
      companyId,
      category: options?.category,
      from: options?.from,
      to: options?.to,
    }),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAX_EXPORT_ROWS,
    include: {
      member: {
        select: { name: true, email: true },
      },
    },
  });

  return events.map(toListItem);
}

export { AuditCategory };
