import type { EstimateStatus } from "@easy-invoice/db";
import { renderInvoicePdf } from "@/lib/ai-docs";
import { prisma } from "@/lib/db";
import { renderEstimateHtmlForEstimate } from "@/lib/estimate-html";
import {
  buildInvoiceTotals,
  isUniqueConstraintError,
  resolveClientForInvoice,
} from "@/lib/invoice-service";
import type { CreateEstimateInput } from "@/lib/schemas/estimate";
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
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const count = await prisma.estimate.count({ where: { companyId } });
    const number = `EST-${String(count + 1 + attempt).padStart(4, "0")}`;

    const exists = await prisma.estimate.findFirst({
      where: { companyId, number },
      select: { id: true },
    });
    if (!exists) return number;
  }

  throw new Error("Could not generate unique estimate number");
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

export async function generateEstimatePdfBuffer(estimateId: string, companyId: string) {
  const estimate = await getEstimateForMember(estimateId, companyId);
  if (!estimate) return null;

  const html = await renderEstimateHtmlForEstimate(estimate);
  const pdfBuffer = await renderInvoicePdf(html);
  return { estimate, pdfBuffer };
}

export { resolveClientForInvoice as resolveClientForEstimate, isUniqueConstraintError };
