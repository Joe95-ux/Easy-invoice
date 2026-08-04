import { format } from "date-fns";
import type { FollowUpSource, FollowUpStatus, Prisma } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import type { FollowUpInput, UpdateFollowUpInput } from "@/lib/schemas/follow-up";

const followUpInclude = {
  client: { select: { id: true, name: true } },
  invoice: { select: { id: true, number: true, status: true } },
  estimate: { select: { id: true, number: true, status: true } },
  member: { select: { id: true, name: true, email: true } },
} satisfies Prisma.FollowUpInclude;

export type FollowUpWithRelations = Prisma.FollowUpGetPayload<{
  include: typeof followUpInclude;
}>;

export type SerializedFollowUp = {
  id: string;
  title: string;
  notes: string | null;
  status: FollowUpStatus;
  dueDate: string | null;
  sortOrder: number;
  source: FollowUpSource;
  sourceKey: string | null;
  clientId: string | null;
  invoiceId: string | null;
  estimateId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string } | null;
  invoice: { id: string; number: string; status: string } | null;
  estimate: { id: string; number: string; status: string } | null;
  member: { id: string; name: string | null; email: string } | null;
};

/** Calendar date key for @db.Date values stored as UTC midnight. */
function dateKey(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function toDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return new Date(`${trimmed}T00:00:00.000Z`);
}

function addDaysKey(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function serializeFollowUp(item: FollowUpWithRelations): SerializedFollowUp {
  return {
    id: item.id,
    title: item.title,
    notes: item.notes,
    status: item.status,
    dueDate: dateKey(item.dueDate),
    sortOrder: item.sortOrder,
    source: item.source,
    sourceKey: item.sourceKey,
    clientId: item.clientId,
    invoiceId: item.invoiceId,
    estimateId: item.estimateId,
    completedAt: item.completedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    client: item.client,
    invoice: item.invoice,
    estimate: item.estimate,
    member: item.member,
  };
}

export async function getFollowUpsForCompany(companyId: string) {
  return prisma.followUp.findMany({
    where: { companyId },
    include: followUpInclude,
    orderBy: [
      { status: "asc" },
      { sortOrder: "asc" },
      { dueDate: "asc" },
      { completedAt: "desc" },
      { createdAt: "asc" },
    ],
  });
}

async function assertLinkedEntities(
  companyId: string,
  data: { clientId?: string | null; invoiceId?: string | null; estimateId?: string | null },
) {
  if (data.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, companyId },
      select: { id: true },
    });
    if (!client) throw new Error("Client not found");
  }
  if (data.invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, companyId },
      select: { id: true, clientId: true },
    });
    if (!invoice) throw new Error("Invoice not found");
    if (!data.clientId && invoice.clientId) {
      data.clientId = invoice.clientId;
    }
  }
  if (data.estimateId) {
    const estimate = await prisma.estimate.findFirst({
      where: { id: data.estimateId, companyId },
      select: { id: true, clientId: true },
    });
    if (!estimate) throw new Error("Estimate not found");
    if (!data.clientId && estimate.clientId) {
      data.clientId = estimate.clientId;
    }
  }
}

async function nextOpenSortOrder(companyId: string) {
  const maxOrder = await prisma.followUp.aggregate({
    where: { companyId, status: "OPEN" },
    _max: { sortOrder: true },
  });
  return (maxOrder._max.sortOrder ?? -1) + 1;
}

export async function createFollowUp(
  companyId: string,
  memberId: string,
  input: FollowUpInput,
) {
  const payload = {
    clientId: input.clientId ?? null,
    invoiceId: input.invoiceId ?? null,
    estimateId: input.estimateId ?? null,
  };
  await assertLinkedEntities(companyId, payload);

  return prisma.followUp.create({
    data: {
      companyId,
      memberId,
      title: input.title.trim(),
      notes: input.notes?.trim() || null,
      dueDate: toDateOnly(input.dueDate),
      sortOrder: await nextOpenSortOrder(companyId),
      source: "MANUAL",
      clientId: payload.clientId,
      invoiceId: payload.invoiceId,
      estimateId: payload.estimateId,
    },
    include: followUpInclude,
  });
}

export async function updateFollowUp(
  companyId: string,
  id: string,
  input: UpdateFollowUpInput,
) {
  const existing = await prisma.followUp.findFirst({
    where: { id, companyId },
  });
  if (!existing) return null;

  const nextLinks = {
    clientId: input.clientId !== undefined ? input.clientId : existing.clientId,
    invoiceId: input.invoiceId !== undefined ? input.invoiceId : existing.invoiceId,
    estimateId: input.estimateId !== undefined ? input.estimateId : existing.estimateId,
  };

  if (
    input.clientId !== undefined ||
    input.invoiceId !== undefined ||
    input.estimateId !== undefined
  ) {
    if (!nextLinks.clientId && !nextLinks.invoiceId && !nextLinks.estimateId) {
      throw new Error("Link a client, invoice, or estimate");
    }
    await assertLinkedEntities(companyId, nextLinks);
  }

  const status = input.status;
  const markingDone = status === "DONE" && existing.status !== "DONE";
  const markingOpen = status === "OPEN" && existing.status !== "OPEN";

  return prisma.followUp.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
      ...(input.dueDate !== undefined && { dueDate: toDateOnly(input.dueDate) }),
      ...(input.clientId !== undefined && { clientId: nextLinks.clientId }),
      ...(input.invoiceId !== undefined && { invoiceId: nextLinks.invoiceId }),
      ...(input.estimateId !== undefined && { estimateId: nextLinks.estimateId }),
      ...(status !== undefined && {
        status,
        completedAt: markingDone ? new Date() : markingOpen ? null : existing.completedAt,
        ...(markingOpen ? { sortOrder: await nextOpenSortOrder(companyId) } : {}),
      }),
    },
    include: followUpInclude,
  });
}

export async function deleteFollowUp(companyId: string, id: string) {
  const existing = await prisma.followUp.findFirst({
    where: { id, companyId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.followUp.delete({ where: { id } });
  return true;
}

export async function reorderFollowUps(companyId: string, orderedIds: string[]) {
  const openItems = await prisma.followUp.findMany({
    where: { companyId, status: "OPEN", id: { in: orderedIds } },
    select: { id: true },
  });
  const allowed = new Set(openItems.map((item) => item.id));
  const ids = orderedIds.filter((id) => allowed.has(id));

  if (ids.length === 0) {
    return getFollowUpsForCompany(companyId);
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.followUp.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return getFollowUpsForCompany(companyId);
}

type Suggestion = {
  sourceKey: string;
  source: FollowUpSource;
  title: string;
  dueDate: Date | null;
  clientId: string | null;
  invoiceId: string | null;
  estimateId: string | null;
};

export async function syncFollowUpSuggestions(companyId: string, memberId: string) {
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const dueSoonCutoff = addDaysKey(todayKey, 3);
  const estimateCutoff = addDaysKey(todayKey, 7);

  const [invoices, estimates, existing] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
      },
      select: {
        id: true,
        number: true,
        status: true,
        dueDate: true,
        clientId: true,
      },
    }),
    prisma.estimate.findMany({
      where: {
        companyId,
        status: { in: ["SENT", "VIEWED", "EXPIRED"] },
      },
      select: {
        id: true,
        number: true,
        status: true,
        validUntil: true,
        clientId: true,
      },
    }),
    prisma.followUp.findMany({
      where: { companyId, sourceKey: { not: null } },
      select: {
        id: true,
        sourceKey: true,
        status: true,
        title: true,
        dueDate: true,
        source: true,
        clientId: true,
        invoiceId: true,
        estimateId: true,
      },
    }),
  ]);

  const suggestions: Suggestion[] = [];

  for (const invoice of invoices) {
    const due = dateKey(invoice.dueDate);
    const isOverdue =
      invoice.status === "OVERDUE" || (due !== null && due < todayKey);

    if (isOverdue) {
      suggestions.push({
        sourceKey: `invoice:overdue:${invoice.id}`,
        source: "INVOICE_OVERDUE",
        title: `Follow up on overdue invoice ${invoice.number}`,
        dueDate: toDateOnly(due ?? todayKey),
        clientId: invoice.clientId,
        invoiceId: invoice.id,
        estimateId: null,
      });
      continue;
    }

    if (due && due >= todayKey && due <= dueSoonCutoff) {
      suggestions.push({
        sourceKey: `invoice:due-soon:${invoice.id}`,
        source: "INVOICE_DUE_SOON",
        title: `Invoice ${invoice.number} is due soon`,
        dueDate: toDateOnly(due),
        clientId: invoice.clientId,
        invoiceId: invoice.id,
        estimateId: null,
      });
    }
  }

  for (const estimate of estimates) {
    const validUntil = dateKey(estimate.validUntil);
    const isExpiring =
      estimate.status === "EXPIRED" ||
      (validUntil !== null && validUntil <= estimateCutoff);

    if (!isExpiring) continue;

    const expired =
      estimate.status === "EXPIRED" || (validUntil !== null && validUntil < todayKey);

    suggestions.push({
      sourceKey: `estimate:expiring:${estimate.id}`,
      source: "ESTIMATE_EXPIRING",
      title: expired
        ? `Follow up on expired estimate ${estimate.number}`
        : `Estimate ${estimate.number} expires soon`,
      dueDate: toDateOnly(validUntil ?? todayKey),
      clientId: estimate.clientId,
      invoiceId: null,
      estimateId: estimate.id,
    });
  }

  const byKey = new Map(
    existing
      .filter((item): item is typeof item & { sourceKey: string } => Boolean(item.sourceKey))
      .map((item) => [item.sourceKey, item]),
  );
  const activeKeys = new Set(suggestions.map((item) => item.sourceKey));

  let created = 0;
  let updated = 0;
  let resolved = 0;

  let nextOrder = await nextOpenSortOrder(companyId);

  await prisma.$transaction(async (tx) => {
    for (const suggestion of suggestions) {
      const current = byKey.get(suggestion.sourceKey);
      if (!current) {
        await tx.followUp.create({
          data: {
            companyId,
            memberId,
            title: suggestion.title,
            dueDate: suggestion.dueDate,
            sortOrder: nextOrder++,
            source: suggestion.source,
            sourceKey: suggestion.sourceKey,
            clientId: suggestion.clientId,
            invoiceId: suggestion.invoiceId,
            estimateId: suggestion.estimateId,
          },
        });
        created += 1;
        continue;
      }

      if (current.status === "DONE") continue;

      const unchanged =
        current.title === suggestion.title &&
        dateKey(current.dueDate) === dateKey(suggestion.dueDate) &&
        current.source === suggestion.source &&
        current.clientId === suggestion.clientId &&
        current.invoiceId === suggestion.invoiceId &&
        current.estimateId === suggestion.estimateId;

      if (unchanged) continue;

      await tx.followUp.update({
        where: { id: current.id },
        data: {
          title: suggestion.title,
          dueDate: suggestion.dueDate,
          source: suggestion.source,
          clientId: suggestion.clientId,
          invoiceId: suggestion.invoiceId,
          estimateId: suggestion.estimateId,
        },
      });
      updated += 1;
    }

    for (const item of existing) {
      if (!item.sourceKey || item.status === "DONE") continue;
      if (activeKeys.has(item.sourceKey)) continue;

      await tx.followUp.update({
        where: { id: item.id },
        data: { status: "DONE", completedAt: new Date() },
      });
      resolved += 1;
    }
  });

  const items = await getFollowUpsForCompany(companyId);
  return { created, updated, resolved, items };
}
