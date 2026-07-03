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

export type InvoicePaymentSummary = {
  amountPaid: number;
  balanceDue: number;
  installments: InstallmentAllocation[];
  nextDueDate: Date | null;
  nextDueAmount: number | null;
};

export function sumPaymentAmounts(
  payments: Array<{ amount: MoneyInput }>,
): number {
  return roundMoney(payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0));
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
    payments?: Array<{ amount: MoneyInput }>;
  },
  today = new Date(),
): InvoicePaymentSummary {
  const amountPaid = sumPaymentAmounts(invoice.payments ?? []);
  const balanceDue = computeBalanceDue(invoice.total, amountPaid);
  const installments = allocatePaymentsToInstallments(
    invoice.installments ?? [],
    amountPaid,
    today,
  );

  const nextUnpaid = installments.find((row) => !row.isPaid);
  if (nextUnpaid) {
    return {
      amountPaid,
      balanceDue,
      installments,
      nextDueDate: nextUnpaid.dueDate,
      nextDueAmount: nextUnpaid.balanceDue,
    };
  }

  if (balanceDue > 0 && invoice.dueDate) {
    const dueStart = new Date(invoice.dueDate);
    dueStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    return {
      amountPaid,
      balanceDue,
      installments,
      nextDueDate: invoice.dueDate,
      nextDueAmount: balanceDue,
    };
  }

  return {
    amountPaid,
    balanceDue,
    installments,
    nextDueDate: null,
    nextDueAmount: null,
  };
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

  const balanceDue = computeBalanceDue(total, amountPaid);
  if (balanceDue <= 0.001) return "PAID";
  if (amountPaid > 0) {
    const hasOverdue =
      summary.installments.some((row) => row.isOverdue) ||
      (summary.installments.length === 0 &&
        summary.nextDueDate !== null &&
        summary.nextDueDate < new Date(new Date().setHours(0, 0, 0, 0)));
    return hasOverdue ? "OVERDUE" : "PARTIALLY_PAID";
  }

  if (currentStatus === "PARTIALLY_PAID") {
    return summary.installments.some((row) => row.isOverdue) ||
      (summary.nextDueDate &&
        summary.nextDueDate < new Date(new Date().setHours(0, 0, 0, 0)))
      ? "OVERDUE"
      : "SENT";
  }

  return currentStatus;
}

export function validateInstallments(
  installments: InstallmentInput[],
  invoiceTotal: number,
): string | null {
  if (installments.length === 0) return null;

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
