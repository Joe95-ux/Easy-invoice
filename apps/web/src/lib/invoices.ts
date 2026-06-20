import type { InvoiceStatus } from "@easy-invoice/db";
import type { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";

export async function getInvoiceForMember(invoiceId: string, companyId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      client: true,
      company: true,
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

export function invoiceStatusLabel(status: InvoiceStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function invoiceStatusVariant(
  status: InvoiceStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PAID":
      return "default";
    case "SENT":
    case "VIEWED":
      return "secondary";
    case "OVERDUE":
      return "destructive";
    default:
      return "outline";
  }
}
