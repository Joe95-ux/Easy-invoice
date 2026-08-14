import { daysUntilDue, startOfUtcDay } from "@/lib/reminders/dates";
import type { InvoiceStatus } from "@easy-invoice/db";

export type CollectionsAction =
  | "send"
  | "remind"
  | "draft_chase"
  | "offer_plan"
  | "follow_up"
  | "none";

export type CollectionsAdvice = {
  action: CollectionsAction;
  urgency: "low" | "medium" | "high";
  title: string;
  reason: string;
  /** True when a 2/3-pay plan is a good offer (unpaid, no schedule yet, meaningful balance). */
  canOfferPlan: boolean;
  /** True when partial card pay (e.g. half) is sensible on the public page. */
  canOfferPartialPay: boolean;
  daysPastDue: number | null;
  daysUntilDue: number | null;
};

/** Minimum balance (major units) to offer a 2/3 payment plan. */
export const MIN_PLAN_BALANCE = 20;
/** Minimum balance (major units) to offer a partial card payment. */
export const MIN_PARTIAL_BALANCE = 20;
/** Stripe card payments require at least 50 minor units in most currencies. */
export const MIN_CARD_AMOUNT = 0.5;

type AdviceInput = {
  status: InvoiceStatus;
  balanceDue: number;
  amountPaid: number;
  dueDate: Date | null;
  sentAt: Date | null;
  viewedAt: Date | null;
  installmentCount: number;
  unpaidInstallmentCount: number;
  today?: Date;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= 0.01;
}

/**
 * Next-best collections action from signals we already store.
 * Keeps copy practical — not a full AR suite.
 */
export function getCollectionsAdvice(input: AdviceInput): CollectionsAdvice {
  const today = startOfUtcDay(input.today ?? new Date());
  const due = input.dueDate ? startOfUtcDay(input.dueDate) : null;
  const until = due ? daysUntilDue(today, due) : null;
  const pastDue = until != null && until < 0 ? Math.abs(until) : null;

  const canOfferPlan =
    input.balanceDue >= MIN_PLAN_BALANCE &&
    input.amountPaid <= 0.001 &&
    input.installmentCount === 0 &&
    !["DRAFT", "CANCELLED", "PAID"].includes(input.status);

  const canOfferPartialPay =
    input.balanceDue >= MIN_PARTIAL_BALANCE &&
    input.installmentCount === 0 &&
    !["DRAFT", "CANCELLED", "PAID"].includes(input.status);

  if (
    input.status === "DRAFT" ||
    input.status === "CANCELLED" ||
    input.status === "PAID" ||
    input.balanceDue <= 0.001
  ) {
    return {
      action: "none",
      urgency: "low",
      title: "Nothing to collect",
      reason: "This invoice does not need a collections action.",
      canOfferPlan: false,
      canOfferPartialPay: false,
      daysPastDue: pastDue,
      daysUntilDue: until,
    };
  }

  if (!input.sentAt) {
    return {
      action: "send",
      urgency: "medium",
      title: "Send the invoice",
      reason: "It is still a draft in the client’s inbox sense — send it before chasing.",
      canOfferPlan,
      canOfferPartialPay: false,
      daysPastDue: pastDue,
      daysUntilDue: until,
    };
  }

  // Seen + overdue/unpaid — highest-leverage human moment.
  if (input.viewedAt && (pastDue != null || input.status === "OVERDUE")) {
    if (canOfferPlan) {
      return {
        action: "offer_plan",
        urgency: pastDue != null && pastDue >= 7 ? "high" : "medium",
        title: "Offer a payment plan",
        reason:
          "They opened the invoice but have not paid. A 2- or 3-part plan often converts better than another reminder.",
        canOfferPlan,
        canOfferPartialPay,
        daysPastDue: pastDue,
        daysUntilDue: until,
      };
    }

    return {
      action: "draft_chase",
      urgency: pastDue != null && pastDue >= 14 ? "high" : "medium",
      title: "Send a firm follow-up",
      reason:
        pastDue != null
          ? `Opened, still unpaid, ${pastDue} day${pastDue === 1 ? "" : "s"} overdue. A short, clear chase works better than a generic reminder.`
          : "They have seen this invoice. Draft a concise chase with the remaining balance.",
      canOfferPlan,
      canOfferPartialPay,
      daysPastDue: pastDue,
      daysUntilDue: until,
    };
  }

  if (pastDue != null && pastDue > 0 && !input.viewedAt) {
    return {
      action: "remind",
      urgency: pastDue >= 7 ? "high" : "medium",
      title: "Send a payment reminder",
      reason: `Overdue by ${pastDue} day${pastDue === 1 ? "" : "s"} and not opened yet — nudge with the share link and balance due.`,
      canOfferPlan,
      canOfferPartialPay,
      daysPastDue: pastDue,
      daysUntilDue: until,
    };
  }

  if (input.status === "PARTIALLY_PAID") {
    return {
      action: "remind",
      urgency: "medium",
      title: "Collect the remaining balance",
      reason: "Partially paid — remind them of what is left, or let them pay the rest online.",
      canOfferPlan: false,
      canOfferPartialPay: false,
      daysPastDue: pastDue,
      daysUntilDue: until,
    };
  }

  if (until != null && until <= 3 && until >= 0) {
    return {
      action: "remind",
      urgency: "low",
      title: "Due soon — gentle reminder",
      reason:
        until === 0
          ? "Due today. A polite reminder keeps you top of mind."
          : `Due in ${until} day${until === 1 ? "" : "s"}. A light nudge helps.`,
      canOfferPlan,
      canOfferPartialPay,
      daysPastDue: pastDue,
      daysUntilDue: until,
    };
  }

  if (input.installmentCount > 0 && input.unpaidInstallmentCount >= 1) {
    return {
      action: "follow_up",
      urgency: "low",
      title: "Track the payment plan",
      reason: "A schedule is in place. Add a follow-up so the next installment does not slip.",
      canOfferPlan: false,
      canOfferPartialPay: false,
      daysPastDue: pastDue,
      daysUntilDue: until,
    };
  }

  return {
    action: "none",
    urgency: "low",
    title: "On track",
    reason: "No urgent collections action right now.",
    canOfferPlan,
    canOfferPartialPay,
    daysPastDue: pastDue,
    daysUntilDue: until,
  };
}

/** Split an invoice total into N equal parts (last part absorbs rounding). */
export function buildEqualPaymentPlan(
  total: number,
  parts: 2 | 3,
  startDate: Date,
  intervalDays = 14,
): { dueDate: string; amount: number; label: string; sortOrder: number }[] {
  const safeTotal = roundMoney(total);
  const base = Math.floor((safeTotal * 100) / parts) / 100;
  const amounts = Array.from({ length: parts }, () => base);
  const sumBase = roundMoney(base * parts);
  amounts[parts - 1] = roundMoney(safeTotal - sumBase + base);

  return amounts.map((amount, index) => {
    const due = new Date(startDate);
    due.setUTCDate(due.getUTCDate() + index * intervalDays);
    const y = due.getUTCFullYear();
    const m = String(due.getUTCMonth() + 1).padStart(2, "0");
    const d = String(due.getUTCDate()).padStart(2, "0");
    return {
      dueDate: `${y}-${m}-${d}`,
      amount,
      label: `Payment ${index + 1} of ${parts}`,
      sortOrder: index,
    };
  });
}

export function suggestedPartialAmount(balanceDue: number): number | null {
  if (balanceDue < MIN_PARTIAL_BALANCE) return null;
  const half = roundMoney(balanceDue / 2);
  if (half < MIN_CARD_AMOUNT) return null;
  if (balanceDue - half < MIN_CARD_AMOUNT) return null;
  return half;
}

/**
 * Resolve what a public checkout may charge.
 * Full balance always OK. With a plan: next installment or full.
 * Without a plan: suggested half (or any amount ≥ min partial up to balance).
 */
export function resolvePublicCheckoutAmount(input: {
  balanceDue: number;
  nextDueAmount: number | null;
  hasInstallments: boolean;
  requested?: number;
}): { ok: true; amount: number } | { ok: false; error: string } {
  const balance = roundMoney(input.balanceDue);
  if (balance <= 0.001) {
    return { ok: false, error: "This invoice is already paid" };
  }

  if (input.requested == null) {
    return { ok: true, amount: balance };
  }

  const requested = roundMoney(input.requested);
  if (requested < MIN_CARD_AMOUNT) {
    return { ok: false, error: "Amount is too small for card payment" };
  }
  if (requested > balance + 0.001) {
    return { ok: false, error: "Amount cannot exceed the balance due" };
  }
  if (amountsMatch(requested, balance)) {
    return { ok: true, amount: balance };
  }

  if (input.hasInstallments) {
    const next = input.nextDueAmount != null ? roundMoney(input.nextDueAmount) : null;
    if (next != null && amountsMatch(requested, next)) {
      return { ok: true, amount: next };
    }
    return {
      ok: false,
      error: "Partial payments on a plan must match the next installment (or pay in full)",
    };
  }

  if (requested < MIN_PARTIAL_BALANCE) {
    return {
      ok: false,
      error: `Partial payments must be at least ${MIN_PARTIAL_BALANCE.toFixed(0)}`,
    };
  }

  return { ok: true, amount: requested };
}
