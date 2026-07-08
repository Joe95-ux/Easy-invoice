import { AuditAction, AuditCategory, ReminderDeliveryStatus, prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit/service";
import { isEmailConfigured, sendPaymentConfirmationEmail } from "@/lib/email";
import { generateInvoicePdfBuffer } from "@/lib/invoice-service";
import { recordDocumentRevision } from "@/lib/document-revisions/service";
import { buildPaymentConfirmationRevisionSummary } from "@/lib/document-revisions/snapshot";
import { generateReceiptPdfBuffer } from "@/lib/receipt-service";

export type PaymentConfirmationEmailRow = {
  id: string;
  toEmail: string;
  isResend: boolean;
  status: ReminderDeliveryStatus;
  error: string | null;
  createdAt: string;
};

export type SendPaymentConfirmationResult =
  | { ok: true; confirmationId: string; toEmail: string }
  | { ok: false; error: string; confirmationId?: string };

type SendPaymentConfirmationOptions = {
  paymentId: string;
  companyId: string;
  memberId?: string | null;
  recipientEmail?: string;
  isResend?: boolean;
};

async function loadPaymentForConfirmation(paymentId: string, companyId: string) {
  return prisma.invoicePayment.findFirst({
    where: {
      id: paymentId,
      invoice: { companyId },
    },
    include: {
      invoice: {
        include: {
          client: true,
          company: {
            select: {
              name: true,
              paymentReceiptEmailsEnabled: true,
            },
          },
        },
      },
    },
  });
}

export async function sendPaymentConfirmationWithLogging(
  options: SendPaymentConfirmationOptions,
): Promise<SendPaymentConfirmationResult> {
  const payment = await loadPaymentForConfirmation(options.paymentId, options.companyId);
  if (!payment) {
    return { ok: false, error: "Payment not found" };
  }

  if (!payment.receiptNumber) {
    return { ok: false, error: "Payment has no receipt number" };
  }

  const invoice = payment.invoice;
  if (!invoice.sentAt) {
    return { ok: false, error: "Invoice has not been sent yet" };
  }

  if (!isEmailConfigured()) {
    return { ok: false, error: "Email is not configured" };
  }

  if (!options.isResend && !invoice.company.paymentReceiptEmailsEnabled) {
    return { ok: false, error: "Payment receipt emails are disabled" };
  }

  const toEmail = options.recipientEmail?.trim() || invoice.client?.email;
  if (!toEmail) {
    return { ok: false, error: "Client email is required" };
  }

  const isResend = options.isResend ?? false;
  const amount = Number(payment.amount);
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: invoice.currency,
  }).format(amount);

  try {
    const [invoicePdf, receiptPdf] = await Promise.all([
      generateInvoicePdfBuffer(invoice.id, options.companyId),
      generateReceiptPdfBuffer(payment.id, options.companyId),
    ]);

    if (!invoicePdf || !receiptPdf) {
      throw new Error("Could not generate invoice or receipt PDF");
    }

    await sendPaymentConfirmationEmail({
      to: toEmail,
      companyName: invoice.company.name,
      invoiceNumber: invoice.number,
      receiptNumber: payment.receiptNumber,
      amount: formattedAmount,
      invoicePdfBuffer: invoicePdf.pdfBuffer,
      receiptPdfBuffer: receiptPdf.pdfBuffer,
    });

    const confirmation = await prisma.paymentConfirmationEmail.create({
      data: {
        paymentId: payment.id,
        memberId: options.memberId ?? null,
        toEmail,
        isResend,
        status: ReminderDeliveryStatus.SENT,
      },
    });

    const summary = buildPaymentConfirmationRevisionSummary({
      toEmail,
      receiptNumber: payment.receiptNumber,
      isResend,
    });

    await recordDocumentRevision({
      companyId: options.companyId,
      documentType: "INVOICE",
      documentId: invoice.id,
      memberId: options.memberId ?? null,
      source: "PAYMENT_CONFIRMATION",
      summary,
      metadata: {
        email: toEmail,
        paymentId: payment.id,
        receiptNumber: payment.receiptNumber,
        confirmationId: confirmation.id,
        isResend,
      },
    });

    await recordAuditEvent({
      companyId: options.companyId,
      memberId: options.memberId,
      category: AuditCategory.DOCUMENT,
      action: isResend
        ? AuditAction.PAYMENT_CONFIRMATION_RESENT
        : AuditAction.PAYMENT_CONFIRMATION_SENT,
      summary: isResend
        ? `Resent payment confirmation for receipt ${payment.receiptNumber} to ${toEmail}`
        : `Sent payment confirmation for receipt ${payment.receiptNumber} to ${toEmail}`,
      entityType: "invoice_payment",
      entityId: payment.id,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        receiptNumber: payment.receiptNumber,
        toEmail,
        confirmationId: confirmation.id,
      },
    });

    return { ok: true, confirmationId: confirmation.id, toEmail };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send payment confirmation";

    const confirmation = await prisma.paymentConfirmationEmail.create({
      data: {
        paymentId: payment.id,
        memberId: options.memberId ?? null,
        toEmail,
        isResend,
        status: ReminderDeliveryStatus.FAILED,
        error: message,
      },
    });

    return { ok: false, error: message, confirmationId: confirmation.id };
  }
}

export async function resendPaymentConfirmation(input: {
  paymentId: string;
  invoiceId: string;
  companyId: string;
  memberId: string;
  recipientEmail?: string;
}): Promise<SendPaymentConfirmationResult> {
  const payment = await prisma.invoicePayment.findFirst({
    where: {
      id: input.paymentId,
      invoiceId: input.invoiceId,
      invoice: { companyId: input.companyId },
    },
    select: { id: true },
  });

  if (!payment) {
    return { ok: false, error: "Payment not found" };
  }

  return sendPaymentConfirmationWithLogging({
    paymentId: input.paymentId,
    companyId: input.companyId,
    memberId: input.memberId,
    recipientEmail: input.recipientEmail,
    isResend: true,
  });
}

export async function getPaymentConfirmationsByInvoice(
  invoiceId: string,
  companyId: string,
): Promise<Map<string, PaymentConfirmationEmailRow[]>> {
  const rows = await prisma.paymentConfirmationEmail.findMany({
    where: {
      payment: { invoiceId, invoice: { companyId } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      paymentId: true,
      toEmail: true,
      isResend: true,
      status: true,
      error: true,
      createdAt: true,
    },
  });

  const grouped = new Map<string, PaymentConfirmationEmailRow[]>();
  for (const row of rows) {
    const entry: PaymentConfirmationEmailRow = {
      id: row.id,
      toEmail: row.toEmail,
      isResend: row.isResend,
      status: row.status,
      error: row.error,
      createdAt: row.createdAt.toISOString(),
    };
    const existing = grouped.get(row.paymentId) ?? [];
    existing.push(entry);
    grouped.set(row.paymentId, existing);
  }

  return grouped;
}

export async function getPaymentConfirmationEmailsForInvoice(
  invoiceId: string,
  companyId: string,
): Promise<PaymentConfirmationEmailRow[]> {
  const rows = await prisma.paymentConfirmationEmail.findMany({
    where: {
      payment: { invoiceId, invoice: { companyId } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      toEmail: true,
      isResend: true,
      status: true,
      error: true,
      createdAt: true,
      paymentId: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    toEmail: row.toEmail,
    isResend: row.isResend,
    status: row.status,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
  }));
}
