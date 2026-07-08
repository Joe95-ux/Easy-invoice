import { prisma } from "@/lib/db";

const SEQUENCE_PAD = 4;

export function getCompanyDocumentPrefix(company: {
  id: string;
  documentPrefix?: string | null;
}): string {
  const custom = company.documentPrefix?.trim();
  if (custom) return custom.toUpperCase();
  return company.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
}

function formatInvoiceNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(SEQUENCE_PAD, "0")}`;
}

function formatReceiptNumber(prefix: string, sequence: number): string {
  return `${prefix}-P${String(sequence).padStart(SEQUENCE_PAD, "0")}`;
}

function formatEstimateNumber(prefix: string, sequence: number): string {
  return `${prefix}-E${String(sequence).padStart(SEQUENCE_PAD, "0")}`;
}

export function previewInvoiceNumber(company: {
  id: string;
  documentPrefix?: string | null;
  invoiceSequence?: number;
}): string {
  const prefix = getCompanyDocumentPrefix(company);
  const sequence = Math.max(company.invoiceSequence ?? 0, 0) + 1;
  return formatInvoiceNumber(prefix, sequence);
}

export function previewReceiptNumber(company: {
  id: string;
  documentPrefix?: string | null;
  receiptSequence?: number;
}): string {
  const prefix = getCompanyDocumentPrefix(company);
  const sequence = Math.max(company.receiptSequence ?? 0, 0) + 1;
  return formatReceiptNumber(prefix, sequence);
}

export function previewEstimateNumber(company: {
  id: string;
  documentPrefix?: string | null;
  estimateSequence?: number;
}): string {
  const prefix = getCompanyDocumentPrefix(company);
  const sequence = Math.max(company.estimateSequence ?? 0, 0) + 1;
  return formatEstimateNumber(prefix, sequence);
}

export async function allocateInvoiceNumber(companyId: string): Promise<string> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const company = await prisma.$transaction(async (tx) => {
      return tx.company.update({
        where: { id: companyId },
        data: { invoiceSequence: { increment: 1 } },
        select: { id: true, documentPrefix: true, invoiceSequence: true },
      });
    });

    const prefix = getCompanyDocumentPrefix(company);
    const number = formatInvoiceNumber(prefix, company.invoiceSequence);

    const exists = await prisma.invoice.findFirst({
      where: { companyId, number },
      select: { id: true },
    });
    if (!exists) return number;
  }

  throw new Error("Could not generate unique invoice number");
}

export async function allocateReceiptNumber(companyId: string): Promise<string> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const company = await prisma.$transaction(async (tx) => {
      return tx.company.update({
        where: { id: companyId },
        data: { receiptSequence: { increment: 1 } },
        select: { id: true, documentPrefix: true, receiptSequence: true },
      });
    });

    const prefix = getCompanyDocumentPrefix(company);
    const receiptNumber = formatReceiptNumber(prefix, company.receiptSequence);

    const exists = await prisma.invoicePayment.findFirst({
      where: { receiptNumber },
      select: { id: true },
    });
    if (!exists) return receiptNumber;
  }

  throw new Error("Could not generate unique receipt number");
}

export async function allocateEstimateNumber(companyId: string): Promise<string> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const company = await prisma.$transaction(async (tx) => {
      return tx.company.update({
        where: { id: companyId },
        data: { estimateSequence: { increment: 1 } },
        select: { id: true, documentPrefix: true, estimateSequence: true },
      });
    });

    const prefix = getCompanyDocumentPrefix(company);
    const number = formatEstimateNumber(prefix, company.estimateSequence);

    const exists = await prisma.estimate.findFirst({
      where: { companyId, number },
      select: { id: true },
    });
    if (!exists) return number;
  }

  throw new Error("Could not generate unique estimate number");
}
