import type { InvoiceStatus } from "@easy-invoice/db";
import { Prisma } from "@easy-invoice/db";
import { renderInvoicePdf } from "@/lib/ai-docs";
import { calculateInvoiceTotals, lineItemAmount } from "@/lib/calculator";
import { renderInvoiceHtmlForInvoice } from "@/lib/invoice-html";
import { prisma } from "@/lib/db";
import type { CreateInvoiceInput } from "@/lib/schemas/invoice";
import { getInvoiceForMember } from "@/lib/invoices";

export async function getInvoicesForMember(companyId: string, limit = 50) {
  return prisma.invoice.findMany({
    where: { companyId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function generateNextInvoiceNumber(companyId: string): Promise<string> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const count = await prisma.invoice.count({ where: { companyId } });
    const number = `INV-${String(count + 1 + attempt).padStart(4, "0")}`;

    const exists = await prisma.invoice.findFirst({
      where: { companyId, number },
      select: { id: true },
    });
    if (!exists) return number;
  }

  throw new Error("Could not generate unique invoice number");
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

export function buildInvoiceTotals(input: CreateInvoiceInput) {
  const lineItems = input.lineItems.map((item) => ({
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: lineItemAmount(item.quantity, item.unitPrice),
    description: item.description,
    sortOrder: item.sortOrder,
  }));

  const totals = calculateInvoiceTotals({
    lineItems: lineItems.map(({ quantity, unitPrice }) => ({ quantity, unitPrice })),
    taxRate: input.taxRate,
    discount: input.discount,
  });

  return { lineItems, totals };
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
