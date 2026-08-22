import type { InvoiceStatus, PaymentMethod } from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import { assertProFeature } from "@/lib/billing/entitlements";
import { recordInvoiceContentRevision } from "@/lib/document-revisions/service";
import { loadInvoiceSnapshot } from "@/lib/document-revisions/service";
import { createNotification } from "@/lib/notifications/service";
import { allocateReceiptNumber } from "@/lib/document-numbers";
import { generatePublicToken } from "@/lib/document-tokens";
import { sendPaymentConfirmationWithLogging } from "@/lib/payment-confirmation";
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
  await prisma.$transaction(async (tx) => {
    await tx.invoiceInstallment.deleteMany({ where: { invoiceId } });

    if (installments.length === 0) return;

    await tx.invoiceInstallment.createMany({
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

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { dueDate: new Date(earliest.dueDate) },
    });
  });
}

/** Remove a payment schedule when nothing has been paid yet. */
export async function clearInvoiceInstallments(invoiceId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.invoiceInstallment.deleteMany({ where: { invoiceId } });
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

  const wasPaid = invoice.status === "PAID";
  const updated = await prisma.invoice.update({
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

  if (nextStatus === "PAID" && !wasPaid) {
    const { resolveFollowUpsForInvoice } = await import("@/lib/follow-ups/service");
    await resolveFollowUpsForInvoice(companyId, invoiceId).catch(() => undefined);
  }

  return updated;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function recordInvoicePayment(input: {
  invoiceId: string;
  companyId: string;
  memberId?: string | null;
  amount: number;
  paidAt?: Date;
  method?: PaymentMethod;
  reference?: string;
  note?: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
}): Promise<{
  invoice: NonNullable<Awaited<ReturnType<typeof refreshInvoicePaymentStatus>>>;
  confirmationEmail?: { sent: boolean; toEmail?: string; error?: string };
  alreadyRecorded?: boolean;
}> {
  if (input.stripeCheckoutSessionId) {
    const existing = await prisma.invoicePayment.findUnique({
      where: { stripeCheckoutSessionId: input.stripeCheckoutSessionId },
      select: { id: true, invoiceId: true },
    });
    if (existing) {
      const invoice = await refreshInvoicePaymentStatus(existing.invoiceId, input.companyId);
      if (!invoice) throw new Error("Invoice not found");
      return { invoice, alreadyRecorded: true };
    }
  } else {
    const company = await prisma.company.findUniqueOrThrow({
      where: { id: input.companyId },
      select: { plan: true },
    });
    assertProFeature(company.plan, "manual_payment_tracking");
  }

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

  const beforeSnapshot = input.memberId
    ? await loadInvoiceSnapshot(input.companyId, input.invoiceId)
    : null;
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
      memberId: input.memberId ?? null,
      receiptNumber,
      publicToken: generatePublicToken(),
      amount,
      paidAt: input.paidAt ?? new Date(),
      method: input.method ?? "OTHER",
      reference: input.reference ?? null,
      note: input.note ?? null,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
      stripePaymentIntentId: input.stripePaymentIntentId ?? null,
    },
    select: { id: true, receiptNumber: true },
  });

  const updated = await refreshInvoicePaymentStatus(input.invoiceId, input.companyId);
  if (!updated) throw new Error("Invoice not found");

  if (input.memberId) {
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
  }

  const memberIds = (
    await prisma.companyMember.findMany({
      where: { companyId: input.companyId },
      select: { id: true },
    })
  ).map((m) => m.id);

  let confirmationEmail: { sent: boolean; toEmail?: string; error?: string } | undefined;

  if (createdPayment && invoice.sentAt && updated.client?.email) {
    const company = await prisma.company.findUnique({
      where: { id: input.companyId },
      select: { paymentReceiptEmailsEnabled: true },
    });

    if (company?.paymentReceiptEmailsEnabled) {
      const result = await sendPaymentConfirmationWithLogging({
        paymentId: createdPayment.id,
        companyId: input.companyId,
        memberId: input.memberId ?? null,
        isResend: false,
      });

      confirmationEmail = result.ok
        ? { sent: true, toEmail: result.toEmail }
        : { sent: false, error: result.error };
    }
  }

  const notificationBody = confirmationEmail?.sent
    ? `${amount.toFixed(2)} ${updated.currency} payment on invoice ${updated.number}. Confirmation emailed to ${confirmationEmail.toEmail}.`
    : confirmationEmail?.error
      ? `${amount.toFixed(2)} ${updated.currency} payment on invoice ${updated.number}. Confirmation email failed: ${confirmationEmail.error}`
      : `${amount.toFixed(2)} ${updated.currency} payment on invoice ${updated.number}`;

  await createNotification({
    companyId: input.companyId,
    recipientMemberIds: memberIds,
    type: "PAYMENT_RECEIVED",
    title: "Payment received",
    body: notificationBody,
    linkUrl: `/invoices/${input.invoiceId}`,
  }).catch(() => undefined);

  return { invoice: updated, confirmationEmail };
}

export async function deleteInvoicePayment(input: {
  invoiceId: string;
  paymentId: string;
  companyId: string;
  memberId: string;
}) {
  const payment = await prisma.invoicePayment.findFirst({
    where: {
      id: input.paymentId,
      invoiceId: input.invoiceId,
      invoice: { companyId: input.companyId },
    },
    include: { invoice: { select: { number: true, currency: true, status: true } } },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.invoice.status === "CANCELLED") {
    throw new Error("Cancelled invoices cannot be modified");
  }

  const beforeSnapshot = await loadInvoiceSnapshot(input.companyId, input.invoiceId);

  // Confirmation email log rows cascade with the payment.
  await prisma.invoicePayment.delete({ where: { id: input.paymentId } });

  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, companyId: input.companyId },
    include: {
      payments: { select: { amount: true } },
      installments: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!invoice) throw new Error("Invoice not found");

  const summary = buildInvoicePaymentSummary(invoice);
  let nextStatus: InvoiceStatus = invoice.status;
  if (invoice.status !== "DRAFT" && invoice.status !== "CANCELLED") {
    nextStatus = deriveInvoiceStatusAfterPayment(
      invoice.status,
      invoice.total,
      summary.amountPaid,
      summary,
    );
    // With no payments left, a formerly paid/partially-paid invoice returns to unpaid.
    if (summary.amountPaid <= 0.001 && nextStatus !== "OVERDUE") {
      const isOverdue =
        invoice.dueDate !== null &&
        invoice.dueDate < new Date(new Date().setHours(0, 0, 0, 0));
      nextStatus = isOverdue ? "OVERDUE" : invoice.viewedAt ? "VIEWED" : "SENT";
    }
  }

  const updated = await prisma.invoice.update({
    where: { id: input.invoiceId },
    data: {
      status: nextStatus,
      paidAt: nextStatus === "PAID" ? invoice.paidAt : null,
    },
    include: {
      client: true,
      company: true,
      template: true,
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      installments: { orderBy: { sortOrder: "asc" } },
    },
  });

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
        deletedPaymentAmount: payment.amount,
        deletedReceiptNumber: payment.receiptNumber,
        amountPaid: summary.amountPaid,
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
    title: "Payment deleted",
    body: `${payment.amount.toFixed(2)} ${payment.invoice.currency} payment${payment.receiptNumber ? ` (receipt ${payment.receiptNumber})` : ""} removed from invoice ${payment.invoice.number}`,
    linkUrl: `/invoices/${input.invoiceId}`,
  }).catch(() => undefined);

  return { invoice: updated };
}
