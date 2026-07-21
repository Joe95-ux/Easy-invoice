import type { EstimateStatus } from "@easy-invoice/db";
import { renderInvoicePdf } from "@/lib/ai-docs";
import { generatePublicToken } from "@/lib/document-tokens";
import { prisma } from "@/lib/db";
import { renderEstimateHtmlForEstimate } from "@/lib/estimate-html";
import {
  buildInvoiceTotals,
  generateNextInvoiceNumber,
  isUniqueConstraintError,
  resolveClientForInvoice,
} from "@/lib/invoice-service";
import type { CreateEstimateInput } from "@/lib/schemas/estimate";
import { allocateEstimateNumber } from "@/lib/document-numbers";
import { getEstimateForMember } from "@/lib/estimates";

export async function getEstimatesForMember(companyId: string, limit = 50) {
  return prisma.estimate.findMany({
    where: { companyId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function generateNextEstimateNumber(companyId: string): Promise<string> {
  return allocateEstimateNumber(companyId);
}

export function buildEstimateTotals(input: CreateEstimateInput) {
  return buildInvoiceTotals(input);
}

const TERMINAL_STATUSES: EstimateStatus[] = ["ACCEPTED", "DECLINED", "CANCELLED"];

export function canTransitionEstimateStatus(from: EstimateStatus, to: EstimateStatus): boolean {
  if (from === to) return true;
  if (TERMINAL_STATUSES.includes(from)) return false;
  return true;
}

export async function generateEstimatePdfBuffer(
  estimateId: string,
  companyId: string,
): Promise<{ estimate: NonNullable<Awaited<ReturnType<typeof getEstimateForMember>>>; pdfBuffer: Buffer } | null> {
  const estimate = await getEstimateForMember(estimateId, companyId);
  if (!estimate) return null;

  const html = await renderEstimateHtmlForEstimate(estimate);
  const pdfBuffer = await renderInvoicePdf(html);
  return { estimate, pdfBuffer };
}

export async function convertEstimateToInvoice(estimateId: string, companyId: string) {
  const estimate = await getEstimateForMember(estimateId, companyId);
  if (!estimate) return null;

  if (estimate.convertedInvoice) {
    return { invoice: estimate.convertedInvoice, created: false };
  }

  if (estimate.status === "DECLINED" || estimate.status === "CANCELLED") {
    return { error: "cannot_convert" as const };
  }

  const lineItems = estimate.items.map((item, index) => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    amount: Number(item.amount),
    sortOrder: index,
  }));

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        companyId,
        clientId: estimate.clientId,
        templateId: estimate.templateId,
        sourceEstimateId: estimate.id,
        number: await generateNextInvoiceNumber(companyId),
        currency: estimate.currency,
        subtotal: estimate.subtotal,
        taxRate: estimate.taxRate,
        taxAmount: estimate.taxAmount,
        discount: estimate.discount,
        total: estimate.total,
        notes: estimate.notes,
        issueDate: new Date(),
        dueDate: estimate.validUntil,
        publicToken: generatePublicToken(),
        items: { create: lineItems },
      },
      include: {
        client: true,
        items: { orderBy: { sortOrder: "asc" } },
        company: true,
        template: true,
      },
    });

    if (estimate.status !== "ACCEPTED") {
      await tx.estimate.update({
        where: { id: estimate.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: estimate.acceptedAt ?? new Date(),
          acceptanceMethod: estimate.acceptanceMethod ?? "STAFF_MARKED",
        },
      });
    }

    return created;
  });

  return { invoice, created: true };
}

export { resolveClientForInvoice as resolveClientForEstimate, isUniqueConstraintError };
