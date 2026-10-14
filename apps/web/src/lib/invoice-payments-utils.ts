import type { InvoiceStatus, PaymentMethod } from "@easy-invoice/db";
import type { Decimal } from "@prisma/client/runtime/library";

type MoneyInput = number | string | Decimal;

function toNumber(value: MoneyInput): number {
  return typeof value === "number" ? value : parseFloat(value.toString());
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type InstallmentInput = {
  dueDate: string;
  amount: number;
  label?: string;
  sortOrder: number;
};

export type InstallmentAllocation = {
  id: string;
  dueDate: Date;
  amount: number;
  label: string | null;
  sortOrder: number;
  paidAmount: number;
  balanceDue: number;
  isPaid: boolean;
  isOverdue: boolean;
};

export type PaymentLike = {
  amount: MoneyInput;
  kind?: string | null;
};

export type CreditNoteLike = {
  total: MoneyInput;
  status?: string | null;
};

export type InvoicePaymentSummary = {
  /** Gross card/cash in (excludes refunds). */
  grossPaid: number;
  /** Money returned to the client. */
  amountRefunded: number;
  /** Net collected = grossPaid − amountRefunded. */
  amountPaid: number;
  /** Issued credit notes against this invoice. */
  amountCredited: number;
  /** Original total minus issued credits. */
  remainingInvoice: number;
  /** What the client still owes. */
  balanceDue: number;
  /** What we still owe the client after credits. */
  refundDue: number;
  installments: InstallmentAllocation[];
  nextDueDate: Date | null;
  nextDueAmount: number | null;
};

export function isRefundPayment(payment: PaymentLike): boolean {
  return payment.kind === "REFUND";
}

export function computePaymentSplits(payments: PaymentLike[]): {
  grossPaid: number;
  amountRefunded: number;
  netCollected: number;
} {
  let grossPaid = 0;
  let amountRefunded = 0;
  for (const payment of payments) {
    const amount = toNumber(payment.amount);
    if (isRefundPayment(payment)) amountRefunded += amount;
    else grossPaid += amount;
  }
  return {
    grossPaid: roundMoney(grossPaid),
    amountRefunded: roundMoney(amountRefunded),
    netCollected: roundMoney(Math.max(0, grossPaid - amountRefunded)),
  };
}

/** Net collected (payments minus refunds). Existing callers treat this as amount paid. */
export function sumPaymentAmounts(payments: Array<PaymentLike>): number {
  return computePaymentSplits(payments).netCollected;
}

export function sumIssuedCredits(creditNotes: CreditNoteLike[] | undefined): number {
  return roundMoney(
    (creditNotes ?? [])
      .filter((note) => !note.status || note.status === "ISSUED")
      .reduce((sum, note) => sum + toNumber(note.total), 0),
  );
}

export function computeBalanceDue(total: MoneyInput, amountPaid: number): number {
  return roundMoney(Math.max(0, toNumber(total) - amountPaid));
}

export function allocatePaymentsToInstallments(
  installments: Array<{
    id: string;
    dueDate: Date;
    amount: MoneyInput;
    label: string | null;
    sortOrder: number;
  }>,
  amountPaid: number,
  today = new Date(),
): InstallmentAllocation[] {
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  let remaining = amountPaid;
  const sorted = [...installments].sort((a, b) => a.sortOrder - b.sortOrder);

  return sorted.map((installment) => {
    const amount = toNumber(installment.amount);
    const paidAmount = roundMoney(Math.min(remaining, amount));
    remaining = roundMoney(Math.max(0, remaining - paidAmount));
    const balanceDue = roundMoney(amount - paidAmount);
    const isPaid = balanceDue <= 0.001;
    const dueStart = new Date(installment.dueDate);
    dueStart.setHours(0, 0, 0, 0);

    return {
      id: installment.id,
      dueDate: installment.dueDate,
      amount,
      label: installment.label,
      sortOrder: installment.sortOrder,
      paidAmount,
      balanceDue,
      isPaid,
      isOverdue: !isPaid && dueStart < todayStart,
    };
  });
}

export function buildInvoicePaymentSummary(
  invoice: {
    total: MoneyInput;
    dueDate?: Date | null;
    installments?: Array<{
      id: string;
      dueDate: Date;
      amount: MoneyInput;
      label: string | null;
      sortOrder: number;
    }>;
    payments?: PaymentLike[];
    creditNotes?: CreditNoteLike[];
  },
  today = new Date(),
): InvoicePaymentSummary {
  const splits = computePaymentSplits(invoice.payments ?? []);
  const amountCredited = sumIssuedCredits(invoice.creditNotes);
  const remainingInvoice = roundMoney(Math.max(0, toNumber(invoice.total) - amountCredited));
  const amountPaid = splits.netCollected;
  const balanceDue = roundMoney(Math.max(0, remainingInvoice - amountPaid));
  const refundDue = roundMoney(Math.max(0, amountPaid - remainingInvoice));
  const installments = allocatePaymentsToInstallments(
    invoice.installments ?? [],
    amountPaid,
    today,
  );

  const nextUnpaid = installments.find((row) => !row.isPaid);
  if (nextUnpaid) {
    return {
      grossPaid: splits.grossPaid,
      amountRefunded: splits.amountRefunded,
      amountPaid,
      amountCredited,
      remainingInvoice,
      balanceDue,
      refundDue,
      installments,
      nextDueDate: nextUnpaid.dueDate,
      nextDueAmount: roundMoney(Math.min(nextUnpaid.balanceDue, balanceDue)),
    };
  }

  if (balanceDue > 0 && invoice.dueDate) {
    const dueStart = new Date(invoice.dueDate);
    dueStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    return {
      grossPaid: splits.grossPaid,
      amountRefunded: splits.amountRefunded,
      amountPaid,
      amountCredited,
      remainingInvoice,
      balanceDue,
      refundDue,
      installments,
      nextDueDate: invoice.dueDate,
      nextDueAmount: balanceDue,
    };
  }

  return {
    grossPaid: splits.grossPaid,
    amountRefunded: splits.amountRefunded,
    amountPaid,
    amountCredited,
    remainingInvoice,
    balanceDue,
    refundDue,
    installments,
    nextDueDate: null,
    nextDueAmount: null,
  };
}

function isPastDue(date: Date | null, today: Date): boolean {
  if (!date) return false;
  const dueStart = new Date(date);
  dueStart.setHours(0, 0, 0, 0);
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  return dueStart < todayStart;
}

export function deriveInvoiceStatusAfterPayment(
  currentStatus: InvoiceStatus,
  total: MoneyInput,
  amountPaid: number,
  summary: InvoicePaymentSummary,
): InvoiceStatus {
  if (currentStatus === "CANCELLED" || currentStatus === "DRAFT") {
    return currentStatus;
  }

  const remainingInvoice =
    summary.remainingInvoice ?? computeBalanceDue(total, summary.amountCredited ?? 0);
  const netCollected = amountPaid;
  const today = new Date();
  const hasOverdue =
    summary.installments.some((row) => row.isOverdue) ||
    (summary.installments.length === 0 && isPastDue(summary.nextDueDate, today));

  if (remainingInvoice <= 0.001) {
    return netCollected <= 0.001 ? "CREDITED" : "PAID";
  }

  const balanceDue = roundMoney(Math.max(0, remainingInvoice - netCollected));
  if (balanceDue <= 0.001) return "PAID";

  if (netCollected > 0.001) {
    return hasOverdue ? "OVERDUE" : "PARTIALLY_PAID";
  }

  if (currentStatus === "PARTIALLY_PAID" || currentStatus === "PAID" || currentStatus === "CREDITED") {
    return hasOverdue ? "OVERDUE" : "SENT";
  }

  if (hasOverdue && (currentStatus === "SENT" || currentStatus === "VIEWED" || currentStatus === "OVERDUE")) {
    return "OVERDUE";
  }

  return currentStatus === "OVERDUE" && !hasOverdue ? "SENT" : currentStatus;
}

export function validateInstallments(
  installments: InstallmentInput[],
  invoiceTotal: number,
): string | null {
  if (installments.length === 0) return null;

  for (const row of installments) {
    if (!Number.isFinite(row.amount) || row.amount <= 0) {
      return "Each installment must be a positive amount";
    }
    if (!row.dueDate || Number.isNaN(new Date(row.dueDate).getTime())) {
      return "Each installment needs a valid due date";
    }
  }

  const sum = roundMoney(installments.reduce((total, row) => total + row.amount, 0));
  if (Math.abs(sum - invoiceTotal) > 0.01) {
    return `Installment amounts must equal the invoice total (${invoiceTotal.toFixed(2)})`;
  }

  return null;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CHECK: "Check",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  OTHER: "Other",
};

/** Prisma include fragment so balance math always sees credits and refunds. */
export const invoiceSettlementInclude = {
  payments: { select: { amount: true, kind: true } },
  creditNotes: {
    where: { status: "ISSUED" as const },
    select: { id: true, total: true, status: true },
  },
} as const;
