import type { EstimateStatus, InvoiceStatus } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import { generatePublicToken } from "@/lib/document-tokens";

const INVOICE_INCLUDE = {
  client: true,
  company: true,
  template: true,
  items: { orderBy: { sortOrder: "asc" as const } },
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
  const now = new Date();
  const data: { viewedAt: Date; status?: InvoiceStatus } = { viewedAt: now };

  if (currentStatus === "SENT") {
    data.status = "VIEWED";
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data,
  });
}

export async function markEstimateViewed(estimateId: string, currentStatus: EstimateStatus) {
  const now = new Date();
  const data: { viewedAt: Date; status?: EstimateStatus } = { viewedAt: now };

  if (currentStatus === "SENT") {
    data.status = "VIEWED";
  }

  return prisma.estimate.update({
    where: { id: estimateId },
    data,
  });
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

  return { estimate: updated, error: null };
}
