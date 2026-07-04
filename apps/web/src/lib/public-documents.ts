import type { EstimateStatus, InvoiceStatus } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import { generatePublicToken } from "@/lib/document-tokens";
import { recordDocumentRevision } from "@/lib/document-revisions/service";
import { createNotification } from "@/lib/notifications/service";

const INVOICE_INCLUDE = {
  client: true,
  company: true,
  template: true,
  items: { orderBy: { sortOrder: "asc" as const } },
  payments: { orderBy: { paidAt: "desc" as const } },
  installments: { orderBy: { sortOrder: "asc" as const } },
} as const;

const ESTIMATE_INCLUDE = {
  client: true,
  company: true,
  template: true,
  items: { orderBy: { sortOrder: "asc" as const } },
  convertedInvoice: { select: { id: true, number: true } },
} as const;

export async function ensureInvoicePublicToken(invoiceId: string, companyId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    select: { id: true, publicToken: true },
  });
  if (!invoice) return null;

  if (invoice.publicToken) return invoice.publicToken;

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generatePublicToken();
    try {
      const updated = await prisma.invoice.update({
        where: { id: invoiceId },
        data: { publicToken: token },
        select: { publicToken: true },
      });
      return updated.publicToken;
    } catch {
      // Unique collision — retry
    }
  }

  return null;
}

export async function ensureEstimatePublicToken(estimateId: string, companyId: string) {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    select: { id: true, publicToken: true },
  });
  if (!estimate) return null;

  if (estimate.publicToken) return estimate.publicToken;

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generatePublicToken();
    try {
      const updated = await prisma.estimate.update({
        where: { id: estimateId },
        data: { publicToken: token },
        select: { publicToken: true },
      });
      return updated.publicToken;
    } catch {
      // Unique collision — retry
    }
  }

  return null;
}

export async function getInvoiceByPublicToken(token: string) {
  return prisma.invoice.findUnique({
    where: { publicToken: token },
    include: INVOICE_INCLUDE,
  });
}

export async function getEstimateByPublicToken(token: string) {
  return prisma.estimate.findUnique({
    where: { publicToken: token },
    include: ESTIMATE_INCLUDE,
  });
}

export async function markInvoiceViewed(invoiceId: string, currentStatus: InvoiceStatus) {
  const existing = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { companyId: true, viewedAt: true, client: { select: { name: true } } },
  });
  if (!existing || existing.viewedAt) {
    return prisma.invoice.findUnique({ where: { id: invoiceId } });
  }

  const now = new Date();
  const data: { viewedAt: Date; status?: InvoiceStatus } = { viewedAt: now };

  if (currentStatus === "SENT") {
    data.status = "VIEWED";
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data,
  });

  const clientName = existing.client?.name ?? "Client";

  await recordDocumentRevision({
    companyId: existing.companyId,
    documentType: "INVOICE",
    documentId: invoiceId,
    source: "VIEWED",
    summary: `Viewed by ${clientName}`,
    metadata: {
      actorName: clientName,
      viewedAt: now.toISOString(),
    },
  });

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { number: true },
  });
  const memberIds = await getCompanyMemberIds(existing.companyId);
  await createNotification({
    companyId: existing.companyId,
    recipientMemberIds: memberIds,
    type: "CLIENT_VIEWED_INVOICE",
    title: `${clientName} viewed invoice`,
    body: `Invoice ${invoice?.number ?? ""} was viewed by ${clientName}`,
    linkUrl: `/invoices/${invoiceId}`,
  }).catch(() => undefined);

  return updated;
}

export async function markEstimateViewed(estimateId: string, currentStatus: EstimateStatus) {
  const existing = await prisma.estimate.findUnique({
    where: { id: estimateId },
    select: { companyId: true, viewedAt: true, client: { select: { name: true } } },
  });
  if (!existing || existing.viewedAt) {
    return prisma.estimate.findUnique({ where: { id: estimateId } });
  }

  const now = new Date();
  const data: { viewedAt: Date; status?: EstimateStatus } = { viewedAt: now };

  if (currentStatus === "SENT") {
    data.status = "VIEWED";
  }

  const updated = await prisma.estimate.update({
    where: { id: estimateId },
    data,
  });

  const clientName = existing.client?.name ?? "Client";

  await recordDocumentRevision({
    companyId: existing.companyId,
    documentType: "ESTIMATE",
    documentId: estimateId,
    source: "VIEWED",
    summary: `Viewed by ${clientName}`,
    metadata: {
      actorName: clientName,
      viewedAt: now.toISOString(),
    },
  });

  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId },
    select: { number: true },
  });
  const memberIds = await getCompanyMemberIds(existing.companyId);
  await createNotification({
    companyId: existing.companyId,
    recipientMemberIds: memberIds,
    type: "CLIENT_VIEWED_ESTIMATE",
    title: `${clientName} viewed estimate`,
    body: `Estimate ${estimate?.number ?? ""} was viewed by ${clientName}`,
    linkUrl: `/estimates/${estimateId}`,
  }).catch(() => undefined);

  return updated;
}

export async function respondToPublicEstimate(
  token: string,
  action: "accept" | "decline",
) {
  const estimate = await getEstimateByPublicToken(token);
  if (!estimate) return null;

  if (["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"].includes(estimate.status)) {
    return { estimate, error: "already_responded" as const };
  }

  const status = action === "accept" ? "ACCEPTED" : "DECLINED";
  const updated = await prisma.estimate.update({
    where: { id: estimate.id },
    data: {
      status,
      ...(action === "accept" && { acceptedAt: new Date() }),
    },
    include: ESTIMATE_INCLUDE,
  });

  const clientName = estimate.client?.name ?? "Client";
  const memberIds = await getCompanyMemberIds(estimate.companyId);
  const verb = action === "accept" ? "accepted" : "declined";
  await createNotification({
    companyId: estimate.companyId,
    recipientMemberIds: memberIds,
    type: action === "accept" ? "ESTIMATE_ACCEPTED" : "ESTIMATE_DECLINED",
    title: `Estimate ${verb}`,
    body: `${clientName} ${verb} estimate ${estimate.number}`,
    linkUrl: `/estimates/${estimate.id}`,
  }).catch(() => undefined);

  return { estimate: updated, error: null };
}

async function getCompanyMemberIds(companyId: string): Promise<string[]> {
  const members = await prisma.companyMember.findMany({
    where: { companyId },
    select: { id: true },
  });
  return members.map((m) => m.id);
}
