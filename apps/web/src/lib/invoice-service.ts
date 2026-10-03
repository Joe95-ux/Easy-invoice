import type { InvoiceStatus } from "@easy-invoice/db";
import { Prisma } from "@easy-invoice/db";
import { renderInvoicePdf } from "@/lib/ai-docs";
import {
  buildDocumentTotals,
  type BuiltDocumentTotals,
  type TotalsLineItem,
} from "@/lib/document-totals";
import { allocateInvoiceNumber } from "@/lib/document-numbers";
import { renderInvoiceHtmlForInvoice } from "@/lib/invoice-html";
import { prisma } from "@/lib/db";
import type { AppliedTax } from "@/lib/schemas/tax-rates";
import { getInvoiceForMember } from "@/lib/invoices";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments";
import {
  type InvoiceListPageSize,
  type InvoiceListRow,
  type InvoiceListSortKey,
  type ListInvoicesResult,
} from "@/lib/invoice-list-shared";

export {
  INVOICE_LIST_PAGE_SIZES,
  type InvoiceListPageSize,
  type InvoiceListRow,
  type InvoiceListSortKey,
  type ListInvoicesResult,
} from "@/lib/invoice-list-shared";

function clampInvoicePageSize(value: number | undefined): InvoiceListPageSize {
  if (value === 25 || value === 50) return value;
  return 15;
}

export async function getInvoicesForMember(companyId: string, limit = 50) {
  return prisma.invoice.findMany({
    where: { companyId },
    include: {
      client: true,
      payments: { select: { amount: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Paginated invoice list for the workspace table — slim selects, DB search/filter.
 */
export async function listInvoicesForMember(input: {
  companyId: string;
  q?: string;
  status?: InvoiceStatus | "all";
  page?: number;
  pageSize?: number;
  sortKey?: InvoiceListSortKey;
  sortDir?: "asc" | "desc";
}): Promise<ListInvoicesResult> {
  const pageSize = clampInvoicePageSize(input.pageSize);
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const sortKey = input.sortKey ?? "dueDate";
  const sortDir = input.sortDir ?? "desc";
  const q = input.q?.trim() ?? "";

  const where: Prisma.InvoiceWhereInput = {
    companyId: input.companyId,
    ...(input.status && input.status !== "all" ? { status: input.status } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { client: { name: { contains: q, mode: "insensitive" } } },
            { client: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.InvoiceOrderByWithRelationInput[] = (() => {
    switch (sortKey) {
      case "number":
        return [{ number: sortDir }];
      case "total":
        return [{ total: sortDir }];
      case "status":
        return [{ status: sortDir }];
      case "clientName":
        return [{ client: { name: sortDir } }];
      case "createdAt":
        return [{ createdAt: sortDir }];
      case "dueDate":
      default:
        return [{ dueDate: sortDir }, { createdAt: "desc" }];
    }
  })();

  const [totalCount, invoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        currency: true,
        dueDate: true,
        sentAt: true,
        clientId: true,
        client: { select: { name: true, email: true } },
        payments: { select: { amount: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const rows: InvoiceListRow[] = invoices.map((invoice) => {
    const paymentSummary = buildInvoicePaymentSummary(invoice);
    return {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      total: invoice.total.toString(),
      balanceDue: paymentSummary.balanceDue.toString(),
      currency: invoice.currency,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      clientId: invoice.clientId,
      clientName: invoice.client?.name ?? null,
      clientEmail: invoice.client?.email ?? null,
      sentAt: invoice.sentAt?.toISOString() ?? null,
    };
  });

  return {
    rows,
    totalCount,
    page: Math.min(page, pageCount),
    pageSize,
    pageCount,
  };
}

export async function generateNextInvoiceNumber(companyId: string): Promise<string> {
  return allocateInvoiceNumber(companyId);
}

type ClientInput = {
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
};

export async function resolveClientForInvoice(companyId: string, input: ClientInput) {
  const clientData = {
    name: input.clientName,
    email: input.clientEmail || null,
    phone: input.clientPhone || null,
    address: input.clientAddress || null,
  };

  if (input.clientId) {
    const existing = await prisma.client.findFirst({
      where: { id: input.clientId, companyId },
    });
    if (!existing) return null;

    return prisma.client.update({
      where: { id: existing.id },
      data: {
        name: clientData.name,
        email: clientData.email ?? existing.email,
        phone: clientData.phone ?? existing.phone,
        address: clientData.address ?? existing.address,
      },
    });
  }

  const existingByName = await prisma.client.findFirst({
    where: { companyId, name: input.clientName },
  });

  if (existingByName) {
    return prisma.client.update({
      where: { id: existingByName.id },
      data: {
        email: clientData.email ?? existingByName.email,
        phone: clientData.phone ?? existingByName.phone,
        address: clientData.address ?? existingByName.address,
      },
    });
  }

  return prisma.client.create({
    data: { companyId, ...clientData },
  });
}

export type BuildInvoiceTotalsInput = {
  lineItems: TotalsLineItem[];
  taxRate: number;
  discount: number;
  taxes?: AppliedTax[] | null;
  /** When true, an empty taxes array clears tax (no fallback to taxRate). */
  taxesProvided?: boolean;
  taxInclusive?: boolean;
  taxCompound?: boolean;
  currency?: string;
  homeCurrency?: string;
  exchangeRate?: number | null;
};

/**
 * Build line amounts + document totals. Delegates to buildDocumentTotals so
 * multi-tax, inclusive, and FX math stay in one place.
 */
export function buildInvoiceTotals(input: BuildInvoiceTotalsInput) {
  const built = buildDocumentTotals({
    lineItems: input.lineItems,
    taxRate: input.taxRate,
    taxes: input.taxes,
    taxesProvided: input.taxesProvided,
    discount: input.discount,
    taxInclusive: input.taxInclusive,
    taxCompound: input.taxCompound,
    currency: input.currency ?? "USD",
    homeCurrency: input.homeCurrency ?? input.currency ?? "USD",
    exchangeRate: input.exchangeRate,
  });

  return {
    lineItems: built.lineItems,
    totals: built.totals,
    built,
  };
}

/** Prisma create/update fields derived from built document totals. */
export function documentTotalsPersistFields(built: BuiltDocumentTotals) {
  return {
    subtotal: built.totals.subtotal,
    taxRate: built.taxRate,
    taxAmount: built.totals.taxAmount,
    total: built.totals.total,
    taxes: built.taxes,
    taxInclusive: built.taxInclusive,
    taxCompound: built.taxCompound,
    exchangeRate: built.exchangeRate,
    homeCurrencyTotal: built.homeCurrencyTotal,
  };
}

const TERMINAL_STATUSES: InvoiceStatus[] = ["PAID", "CANCELLED"];

export function canTransitionInvoiceStatus(from: InvoiceStatus, to: InvoiceStatus): boolean {
  if (from === to) return true;
  if (TERMINAL_STATUSES.includes(from)) return false;
  return true;
}

export async function generateInvoicePdfBuffer(invoiceId: string, companyId: string) {
  const invoice = await getInvoiceForMember(invoiceId, companyId);
  if (!invoice) return null;

  const html = await renderInvoiceHtmlForInvoice(invoice);
  const pdfBuffer = await renderInvoicePdf(html);
  return { invoice, pdfBuffer };
}

export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
