import { Prisma, type DocumentRevisionSource, type DocumentType } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import {
  buildRevisionSummary,
  estimateToSnapshot,
  invoiceToSnapshot,
  snapshotLineItemsToCreate,
  snapshotsEqual,
} from "@/lib/document-revisions/snapshot";
import {
  canDuplicateFromVersion,
  canRestoreInPlace,
  getRevisionPermissions,
} from "@/lib/document-revisions/rules";
import type {
  DocumentSnapshot,
  RevisionListItem,
  RevisionPermissions,
} from "@/lib/document-revisions/types";
import {
  buildEstimateTotals,
  generateNextEstimateNumber,
} from "@/lib/estimate-service";
import { estimateDetailInclude, getEstimateForMember } from "@/lib/estimates";
import {
  buildInvoiceTotals,
  generateNextInvoiceNumber,
} from "@/lib/invoice-service";
import { getInvoiceForMember } from "@/lib/invoices";
import {
  linkTimeEntriesToInvoice,
  releaseTimeEntriesForInvoice,
} from "@/lib/time-tracking/service";

const MAX_REVISIONS_PER_DOCUMENT = 50;

async function nextRevisionNumber(documentType: DocumentType, documentId: string) {
  const last = await prisma.documentRevision.findFirst({
    where: { documentType, documentId },
    orderBy: { revisionNumber: "desc" },
    select: { revisionNumber: true },
  });
  return (last?.revisionNumber ?? 0) + 1;
}

async function pruneOldRevisions(documentType: DocumentType, documentId: string) {
  const revisions = await prisma.documentRevision.findMany({
    where: { documentType, documentId, snapshot: { not: Prisma.DbNull } },
    orderBy: { revisionNumber: "desc" },
    select: { id: true },
    skip: MAX_REVISIONS_PER_DOCUMENT,
  });

  if (revisions.length === 0) return;

  await prisma.documentRevision.deleteMany({
    where: { id: { in: revisions.map((row) => row.id) } },
  });
}

export async function loadInvoiceSnapshot(
  companyId: string,
  invoiceId: string,
): Promise<DocumentSnapshot | null> {
  const invoice = await getInvoiceForMember(invoiceId, companyId);
  if (!invoice) return null;

  const itemsWithTime = await prisma.invoiceLineItem.findMany({
    where: { invoiceId },
    orderBy: { sortOrder: "asc" },
    select: {
      sortOrder: true,
      timeEntries: { select: { id: true } },
    },
  });
  const timeEntryIdsBySortOrder = new Map<number, string[]>();
  for (const item of itemsWithTime) {
    const ids = item.timeEntries.map((entry) => entry.id);
    if (ids.length > 0) timeEntryIdsBySortOrder.set(item.sortOrder, ids);
  }

  return invoiceToSnapshot(invoice, timeEntryIdsBySortOrder);
}

export async function loadEstimateSnapshot(
  companyId: string,
  estimateId: string,
): Promise<DocumentSnapshot | null> {
  const estimate = await getEstimateForMember(estimateId, companyId);
  if (!estimate) return null;
  return estimateToSnapshot(estimate);
}

type RecordRevisionInput = {
  companyId: string;
  documentType: DocumentType;
  documentId: string;
  memberId?: string | null;
  source: DocumentRevisionSource;
  snapshot?: DocumentSnapshot | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

export async function recordDocumentRevision(input: RecordRevisionInput) {
  const revisionNumber = await nextRevisionNumber(input.documentType, input.documentId);

  const revision = await prisma.documentRevision.create({
    data: {
      companyId: input.companyId,
      documentType: input.documentType,
      documentId: input.documentId,
      revisionNumber,
      snapshot: input.snapshot ?? undefined,
      summary: input.summary,
      source: input.source,
      memberId: input.memberId ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  });

  if (input.snapshot) {
    await pruneOldRevisions(input.documentType, input.documentId);
  }

  return revision;
}

export async function recordInvoiceContentRevision(
  companyId: string,
  invoiceId: string,
  memberId: string,
  before: DocumentSnapshot | null,
  after: DocumentSnapshot,
  source: DocumentRevisionSource = "EDIT",
  metadata?: Record<string, unknown>,
) {
  if (before && snapshotsEqual(before, after) && source === "EDIT") return null;

  return recordDocumentRevision({
    companyId,
    documentType: "INVOICE",
    documentId: invoiceId,
    memberId,
    source,
    snapshot: after,
    summary: buildRevisionSummary(before, after, source, metadata),
    metadata,
  });
}

export async function recordEstimateContentRevision(
  companyId: string,
  estimateId: string,
  memberId: string,
  before: DocumentSnapshot | null,
  after: DocumentSnapshot,
  source: DocumentRevisionSource = "EDIT",
  metadata?: Record<string, unknown>,
) {
  if (before && snapshotsEqual(before, after) && source === "EDIT") return null;

  return recordDocumentRevision({
    companyId,
    documentType: "ESTIMATE",
    documentId: estimateId,
    memberId,
    source,
    snapshot: after,
    summary: buildRevisionSummary(before, after, source, metadata),
    metadata,
  });
}

export async function listDocumentRevisions(
  companyId: string,
  documentType: DocumentType,
  documentId: string,
): Promise<RevisionListItem[]> {
  const revisions = await prisma.documentRevision.findMany({
    where: { companyId, documentType, documentId },
    orderBy: { revisionNumber: "desc" },
    include: { member: { select: { email: true } } },
    take: 50,
  });

  return revisions.map((revision) => ({
    id: revision.id,
    revisionNumber: revision.revisionNumber,
    summary: revision.summary,
    source: revision.source,
    createdAt: revision.createdAt.toISOString(),
    actorEmail: revision.member?.email ?? null,
    hasSnapshot: revision.snapshot !== null,
  }));
}

export async function getDocumentRevision(companyId: string, revisionId: string) {
  return prisma.documentRevision.findFirst({
    where: { id: revisionId, companyId },
    include: { member: { select: { email: true } } },
  });
}

export function getDocumentRevisionPermissions(
  documentType: DocumentType,
  status: DocumentSnapshot["status"],
  options?: { hasConvertedInvoice?: boolean },
): RevisionPermissions {
  return getRevisionPermissions(documentType, status, options);
}

async function applyInvoiceSnapshot(
  companyId: string,
  invoiceId: string,
  snapshot: DocumentSnapshot,
) {
  await releaseTimeEntriesForInvoice(invoiceId);
  await prisma.invoiceLineItem.deleteMany({ where: { invoiceId } });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      clientId: snapshot.clientId,
      issueDate: new Date(snapshot.issueDate),
      dueDate: snapshot.dueDate ? new Date(snapshot.dueDate) : null,
      currency: snapshot.currency,
      taxRate: snapshot.taxRate,
      discount: snapshot.discount,
      subtotal: snapshot.subtotal,
      taxAmount: snapshot.taxAmount,
      total: snapshot.total,
      notes: snapshot.notes,
      templateId: snapshot.templateId,
      ...(snapshot.remindersPaused !== undefined && {
        remindersPaused: snapshot.remindersPaused,
      }),
    },
  });

  await prisma.invoiceLineItem.createMany({
    data: snapshotLineItemsToCreate(snapshot.lineItems).map((item) => ({
      invoiceId,
      ...item,
    })),
  });

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    select: { status: true },
  });

  if (invoice?.status === "DRAFT") {
    await linkTimeEntriesToInvoice(
      companyId,
      invoiceId,
      snapshot.lineItems.map((item) => ({
        sortOrder: item.sortOrder,
        timeEntryIds: item.timeEntryIds,
      })),
    ).catch(() => undefined);
  }
}

async function applyEstimateSnapshot(
  companyId: string,
  estimateId: string,
  snapshot: DocumentSnapshot,
) {
  await prisma.estimateLineItem.deleteMany({ where: { estimateId } });

  await prisma.estimate.update({
    where: { id: estimateId },
    data: {
      clientId: snapshot.clientId,
      issueDate: new Date(snapshot.issueDate),
      validUntil: snapshot.validUntil ? new Date(snapshot.validUntil) : null,
      currency: snapshot.currency,
      taxRate: snapshot.taxRate,
      discount: snapshot.discount,
      subtotal: snapshot.subtotal,
      taxAmount: snapshot.taxAmount,
      total: snapshot.total,
      notes: snapshot.notes,
      templateId: snapshot.templateId,
    },
  });

  await prisma.estimateLineItem.createMany({
    data: snapshotLineItemsToCreate(snapshot.lineItems).map((item) => ({
      estimateId,
      ...item,
    })),
  });
}

export async function restoreDocumentRevision(
  companyId: string,
  memberId: string,
  revisionId: string,
) {
  const revision = await getDocumentRevision(companyId, revisionId);
  if (!revision?.snapshot) {
    throw new Error("Revision not found");
  }

  const snapshot = revision.snapshot as DocumentSnapshot;

  if (revision.documentType === "INVOICE") {
    const invoice = await getInvoiceForMember(revision.documentId, companyId);
    if (!invoice) throw new Error("Invoice not found");
    if (!canRestoreInPlace("INVOICE", invoice.status)) {
      throw new Error("Only draft invoices can be restored in place");
    }

    await applyInvoiceSnapshot(companyId, revision.documentId, snapshot);
    const after = await loadInvoiceSnapshot(companyId, revision.documentId);
    if (!after) throw new Error("Invoice not found");

    await recordInvoiceContentRevision(
      companyId,
      revision.documentId,
      memberId,
      null,
      after,
      "RESTORE",
      { restoredFrom: revision.revisionNumber },
    );

    return getInvoiceForMember(revision.documentId, companyId);
  }

  const estimate = await getEstimateForMember(revision.documentId, companyId);
  if (!estimate) throw new Error("Estimate not found");
  if (!canRestoreInPlace("ESTIMATE", estimate.status)) {
    throw new Error("Only draft estimates can be restored in place");
  }

  await applyEstimateSnapshot(companyId, revision.documentId, snapshot);
  const after = await loadEstimateSnapshot(companyId, revision.documentId);
  if (!after) throw new Error("Estimate not found");

  await recordEstimateContentRevision(
    companyId,
    revision.documentId,
    memberId,
    null,
    after,
    "RESTORE",
    { restoredFrom: revision.revisionNumber },
  );

  return getEstimateForMember(revision.documentId, companyId);
}

export async function duplicateDocumentFromRevision(
  companyId: string,
  memberId: string,
  revisionId: string,
) {
  const revision = await getDocumentRevision(companyId, revisionId);
  if (!revision?.snapshot) {
    throw new Error("Revision not found");
  }

  const snapshot = revision.snapshot as DocumentSnapshot;

  if (revision.documentType === "INVOICE") {
    const invoice = await getInvoiceForMember(revision.documentId, companyId);
    if (!invoice) throw new Error("Invoice not found");
    if (!canDuplicateFromVersion("INVOICE", invoice.status)) {
      throw new Error("This invoice cannot be duplicated from history");
    }

    const client = snapshot.clientId
      ? await prisma.client.findFirst({
          where: { id: snapshot.clientId, companyId },
          select: { id: true, name: true },
        })
      : null;

    const { lineItems, totals } = buildInvoiceTotals({
      clientName: client?.name ?? "Client",
      currency: snapshot.currency,
      taxRate: snapshot.taxRate,
      discount: snapshot.discount,
      lineItems: snapshot.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sortOrder: item.sortOrder,
      })),
    });

    const created = await prisma.invoice.create({
      data: {
        companyId,
        clientId: snapshot.clientId,
        templateId: snapshot.templateId,
        number: await generateNextInvoiceNumber(companyId),
        status: "DRAFT",
        currency: snapshot.currency,
        subtotal: totals.subtotal,
        taxRate: snapshot.taxRate,
        taxAmount: totals.taxAmount,
        discount: snapshot.discount,
        total: totals.total,
        notes: snapshot.notes,
        issueDate: new Date(),
        dueDate: snapshot.dueDate ? new Date(snapshot.dueDate) : null,
        items: { create: lineItems },
      },
      include: {
        client: true,
        items: { orderBy: { sortOrder: "asc" } },
        company: true,
        template: true,
      },
    });

    const createdSnapshot = await loadInvoiceSnapshot(companyId, created.id);
    if (createdSnapshot) {
      await recordDocumentRevision({
        companyId,
        documentType: "INVOICE",
        documentId: created.id,
        memberId,
        source: "CREATE",
        snapshot: createdSnapshot,
        summary: `Created from version ${revision.revisionNumber} of ${snapshot.number}`,
        metadata: { duplicatedFromRevisionId: revision.id },
      });
    }

    return created;
  }

  const estimate = await getEstimateForMember(revision.documentId, companyId);
  if (!estimate) throw new Error("Estimate not found");
  if (
    !canDuplicateFromVersion("ESTIMATE", estimate.status, {
      hasConvertedInvoice: Boolean(estimate.convertedInvoice),
    })
  ) {
    throw new Error("This estimate cannot be duplicated from history");
  }

  const client = snapshot.clientId
    ? await prisma.client.findFirst({
        where: { id: snapshot.clientId, companyId },
        select: { id: true, name: true },
      })
    : null;

  const { lineItems, totals } = buildEstimateTotals({
    clientName: client?.name ?? "Client",
    currency: snapshot.currency,
    taxRate: snapshot.taxRate,
    discount: snapshot.discount,
    lineItems: snapshot.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      sortOrder: item.sortOrder,
    })),
  });

  const created = await prisma.estimate.create({
    data: {
      companyId,
      clientId: snapshot.clientId,
      templateId: snapshot.templateId,
      number: await generateNextEstimateNumber(companyId),
      status: "DRAFT",
      currency: snapshot.currency,
      subtotal: totals.subtotal,
      taxRate: snapshot.taxRate,
      taxAmount: totals.taxAmount,
      discount: snapshot.discount,
      total: totals.total,
      notes: snapshot.notes,
      issueDate: new Date(),
      validUntil: snapshot.validUntil ? new Date(snapshot.validUntil) : null,
      items: { create: lineItems },
    },
    include: estimateDetailInclude,
  });

  const createdSnapshot = await loadEstimateSnapshot(companyId, created.id);
  if (createdSnapshot) {
    await recordDocumentRevision({
      companyId,
      documentType: "ESTIMATE",
      documentId: created.id,
      memberId,
      source: "CREATE",
      snapshot: createdSnapshot,
      summary: `Created from version ${revision.revisionNumber} of ${snapshot.number}`,
      metadata: { duplicatedFromRevisionId: revision.id },
    });
  }

  return created;
}
