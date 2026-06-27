import type { EstimateStatus } from "@easy-invoice/db";
import type { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";

export async function getEstimateForMember(estimateId: string, companyId: string) {
  return prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: {
      client: true,
      company: true,
      template: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
}

type MoneyInput = number | string | Decimal;

function toNumber(amount: MoneyInput): number {
  return typeof amount === "number" ? amount : parseFloat(amount.toString());
}

export function formatMoney(amount: MoneyInput, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(toNumber(amount));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function estimateStatusLabel(status: EstimateStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function estimateStatusVariant(
  status: EstimateStatus,
): "secondary" | "destructive" | "outline" | "success" | "info" {
  switch (status) {
    case "ACCEPTED":
      return "success";
    case "SENT":
    case "VIEWED":
      return "info";
    case "EXPIRED":
    case "DECLINED":
      return "destructive";
    default:
      return "outline";
  }
}
