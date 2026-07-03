import { Prisma, type AuditAction, type AuditCategory } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import { formatRevisionActor, resolveMemberProfile } from "@/lib/member-email";
import { notifyAuditAlert } from "./alerts";
import type { AuditEventListItem, RecordAuditEventInput } from "./types";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_EXPORT_ROWS = 5000;

type ListAuditEventsInput = {
  companyId: string;
  category?: AuditCategory;
  cursor?: string;
  limit?: number;
};

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

function toListItem(event: {
  id: string;
  category: AuditCategory;
  action: import("@easy-invoice/db").AuditAction;
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

export async function listAuditEvents(input: ListAuditEventsInput) {
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);

  const events = await prisma.auditEvent.findMany({
    where: {
      companyId: input.companyId,
      ...(input.category ? { category: input.category } : {}),
      ...(input.cursor ? { id: { lt: input.cursor } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: {
      member: {
        select: { name: true, email: true },
      },
    },
  });

  const hasMore = events.length > limit;
  const page = hasMore ? events.slice(0, limit) : events;
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

  return {
    events: page.map(toListItem),
    nextCursor,
  };
}

export async function listAuditEventsForExport(companyId: string, category?: AuditCategory) {
  const events = await prisma.auditEvent.findMany({
    where: {
      companyId,
      ...(category ? { category } : {}),
    },
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
