import type { InvoiceStatus, PaymentMethod } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import { recordInvoiceContentRevision } from "@/lib/document-revisions/service";
import { loadInvoiceSnapshot } from "@/lib/document-revisions/service";
import { createNotification } from "@/lib/notifications/service";
import { allocateReceiptNumber } from "@/lib/document-numbers";
import { generatePublicToken } from "@/lib/document-tokens";
import { isEmailConfigured, sendPaymentConfirmationEmail } from "@/lib/email";
import { generateInvoicePdfBuffer } from "@/lib/invoice-service";
import { generateReceiptPdfBuffer } from "@/lib/receipt-service";
import {
  buildInvoicePaymentSummary,
  deriveInvoiceStatusAfterPayment,
  type InstallmentInput,
} from "@/lib/invoice-payments-utils";

export * from "@/lib/invoice-payments-utils";

export async function syncInvoiceInstallments(
  invoiceId: string,
  installments: InstallmentInput[],
) {
  await prisma.invoiceInstallment.deleteMany({ where: { invoiceId } });

  if (installments.length === 0) return;

  await prisma.invoiceInstallment.createMany({
    data: installments.map((row) => ({
      invoiceId,
      dueDate: new Date(row.dueDate),
      amount: row.amount,
      label: row.label ?? null,
      sortOrder: row.sortOrder,
    })),
  });

  const earliest = installments.reduce((min, row) =>
    new Date(row.dueDate).getTime() < new Date(min.dueDate).getTime() ? row : min,
  );

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { dueDate: new Date(earliest.dueDate) },
  });
}

export async function refreshInvoicePaymentStatus(invoiceId: string, companyId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      payments: { select: { amount: true } },
      installments: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) return null;

  const summary = buildInvoicePaymentSummary(invoice);
  const nextStatus = deriveInvoiceStatusAfterPayment(
    invoice.status,
    invoice.total,
    summary.amountPaid,
    summary,
  );

  const data: {
    status: InvoiceStatus;
    paidAt?: Date | null;
    dueDate?: Date | null;
  } = { status: nextStatus };

  if (nextStatus === "PAID") {
    data.paidAt = invoice.paidAt ?? new Date();
  } else if (summary.amountPaid > 0) {
    data.paidAt = null;
  }

  if (summary.nextDueDate) {
    data.dueDate = summary.nextDueDate;
  }

  return prisma.invoice.update({
    where: { id: invoiceId },
    data,
    include: {
      client: true,
      company: true,
      template: true,
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      installments: { orderBy: { sortOrder: "asc" } },
    },
  });
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function recordInvoicePayment(input: {
  invoiceId: string;
  companyId: string;
  memberId: string;
  amount: number;
  paidAt?: Date;
  method?: PaymentMethod;
  reference?: string;
  note?: string;
}) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, companyId: input.companyId },
    include: {
      payments: { select: { amount: true } },
      installments: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "DRAFT") {
    throw new Error("Send the invoice before recording payments");
  }
  if (invoice.status === "CANCELLED") {
    throw new Error("Cancelled invoices cannot accept payments");
  }
  if (invoice.status === "PAID") {
    throw new Error("Invoice is already fully paid");
  }

  const beforeSnapshot = await loadInvoiceSnapshot(input.companyId, input.invoiceId);
  const summary = buildInvoicePaymentSummary(invoice);
  const amount = roundMoney(input.amount);

  if (amount <= 0) throw new Error("Payment amount must be greater than zero");
  if (amount > summary.balanceDue + 0.001) {
    throw new Error(`Payment cannot exceed the balance due (${summary.balanceDue.toFixed(2)})`);
  }

  const receiptNumber = await allocateReceiptNumber(input.companyId);
  const createdPayment = await prisma.invoicePayment.create({
    data: {
      invoiceId: input.invoiceId,
      memberId: input.memberId,
      receiptNumber,
      publicToken: generatePublicToken(),
      amount,
      paidAt: input.paidAt ?? new Date(),
      method: input.method ?? "OTHER",
      reference: input.reference ?? null,
      note: input.note ?? null,
    },
    select: { id: true, receiptNumber: true },
  });

  const updated = await refreshInvoicePaymentStatus(input.invoiceId, input.companyId);
  if (!updated) throw new Error("Invoice not found");

  const afterSnapshot = await loadInvoiceSnapshot(input.companyId, input.invoiceId);
  if (afterSnapshot) {
    await recordInvoiceContentRevision(
      input.companyId,
      input.invoiceId,
      input.memberId,
      beforeSnapshot,
      afterSnapshot,
      "STATUS",
      {
        paymentAmount: amount,
        amountPaid: buildInvoicePaymentSummary(updated).amountPaid,
      },
    );
  }

  const memberIds = (
    await prisma.companyMember.findMany({
      where: { companyId: input.companyId },
      select: { id: true },
    })
  ).map((m) => m.id);

  await createNotification({
    companyId: input.companyId,
    recipientMemberIds: memberIds,
    type: "PAYMENT_RECEIVED",
    title: "Payment received",
    body: `${amount.toFixed(2)} ${updated.currency} payment on invoice ${updated.number}`,
    linkUrl: `/invoices/${input.invoiceId}`,
  }).catch(() => undefined);

  if (
    createdPayment &&
    invoice.sentAt &&
    updated.client?.email &&
    isEmailConfigured()
  ) {
    const company = await prisma.company.findUnique({
      where: { id: input.companyId },
      select: { paymentReceiptEmailsEnabled: true, name: true },
    });

    if (company?.paymentReceiptEmailsEnabled) {
      void sendPaymentConfirmationForRecordedPayment({
        paymentId: createdPayment.id,
        companyId: input.companyId,
        invoiceId: input.invoiceId,
        to: updated.client.email,
        companyName: company.name,
        invoiceNumber: updated.number,
        receiptNumber: createdPayment.receiptNumber ?? "",
        amount,
        currency: updated.currency,
      }).catch(() => undefined);
    }
  }

  return updated;
}

async function sendPaymentConfirmationForRecordedPayment(input: {
  paymentId: string;
  companyId: string;
  invoiceId: string;
  to: string;
  companyName: string;
  invoiceNumber: string;
  receiptNumber: string;
  amount: number;
  currency: string;
}) {
  const [invoicePdf, receiptPdf] = await Promise.all([
    generateInvoicePdfBuffer(input.invoiceId, input.companyId),
    generateReceiptPdfBuffer(input.paymentId, input.companyId),
  ]);

  if (!invoicePdf || !receiptPdf) return;

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: input.currency,
  }).format(input.amount);

  await sendPaymentConfirmationEmail({
    to: input.to,
    companyName: input.companyName,
    invoiceNumber: input.invoiceNumber,
    receiptNumber: input.receiptNumber,
    amount: formattedAmount,
    invoicePdfBuffer: invoicePdf.pdfBuffer,
    receiptPdfBuffer: receiptPdf.pdfBuffer,
  });
}
