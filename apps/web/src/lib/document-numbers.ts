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
