/**
 * Run: `npx tsx --test apps/web/src/lib/invoice-payments-utils.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInvoicePaymentSummary,
  deriveInvoiceStatusAfterPayment,
} from "./invoice-payments-utils";

describe("invoice settlement math", () => {
  it("treats payments without kind as collections", () => {
    const summary = buildInvoicePaymentSummary({
      total: 100,
      payments: [{ amount: 40 }],
    });
    assert.equal(summary.amountPaid, 40);
    assert.equal(summary.balanceDue, 60);
    assert.equal(summary.amountCredited, 0);
    assert.equal(summary.refundDue, 0);
  });

  it("reduces the balance when an unpaid invoice is credited", () => {
    const summary = buildInvoicePaymentSummary({
      total: 100,
      payments: [],
      creditNotes: [{ total: 40, status: "ISSUED" }],
    });
    assert.equal(summary.amountCredited, 40);
    assert.equal(summary.remainingInvoice, 60);
    assert.equal(summary.balanceDue, 60);
    assert.equal(summary.refundDue, 0);
    assert.equal(
      deriveInvoiceStatusAfterPayment("SENT", 100, summary.amountPaid, summary),
      "SENT",
    );
  });

  it("marks a fully credited unpaid invoice as CREDITED", () => {
    const summary = buildInvoicePaymentSummary({
      total: 100,
      creditNotes: [{ total: 100, status: "ISSUED" }],
    });
    assert.equal(summary.balanceDue, 0);
    assert.equal(
      deriveInvoiceStatusAfterPayment("SENT", 100, summary.amountPaid, summary),
      "CREDITED",
    );
  });

  it("keeps PAID and surfaces refundDue after crediting a paid invoice", () => {
    const summary = buildInvoicePaymentSummary({
      total: 100,
      payments: [{ amount: 100, kind: "PAYMENT" }],
      creditNotes: [{ total: 100, status: "ISSUED" }],
    });
    assert.equal(summary.balanceDue, 0);
    assert.equal(summary.refundDue, 100);
    assert.equal(
      deriveInvoiceStatusAfterPayment("PAID", 100, summary.amountPaid, summary),
      "PAID",
    );
  });

  it("becomes CREDITED after the refund is recorded", () => {
    const summary = buildInvoicePaymentSummary({
      total: 100,
      payments: [
        { amount: 100, kind: "PAYMENT" },
        { amount: 100, kind: "REFUND" },
      ],
      creditNotes: [{ total: 100, status: "ISSUED" }],
    });
    assert.equal(summary.amountPaid, 0);
    assert.equal(summary.refundDue, 0);
    assert.equal(
      deriveInvoiceStatusAfterPayment("PAID", 100, summary.amountPaid, summary),
      "CREDITED",
    );
  });

  it("ignores draft credit notes", () => {
    const summary = buildInvoicePaymentSummary({
      total: 100,
      creditNotes: [{ total: 100, status: "DRAFT" }],
    });
    assert.equal(summary.amountCredited, 0);
    assert.equal(summary.balanceDue, 100);
  });

  it("marks UTC-midnight installments overdue on the UTC calendar day", () => {
    const today = new Date("2026-11-02T18:00:00.000Z");
    const summary = buildInvoicePaymentSummary(
      {
        total: 100,
        dueDate: new Date("2026-11-01T00:00:00.000Z"),
        installments: [
          {
            id: "1",
            dueDate: new Date("2026-11-01T00:00:00.000Z"),
            amount: 100,
            label: null,
            sortOrder: 0,
          },
        ],
      },
      today,
    );
    assert.equal(summary.installments[0]?.isOverdue, true);
  });

  it("does not mark a UTC-midnight installment overdue on its due day", () => {
    const today = new Date("2026-11-02T18:00:00.000Z");
    const summary = buildInvoicePaymentSummary(
      {
        total: 100,
        installments: [
          {
            id: "1",
            dueDate: new Date("2026-11-02T00:00:00.000Z"),
            amount: 100,
            label: null,
            sortOrder: 0,
          },
        ],
      },
      today,
    );
    assert.equal(summary.installments[0]?.isOverdue, false);
  });

  it("adds late fees to the remaining balance", () => {
    const summary = buildInvoicePaymentSummary({
      total: 100,
      creditNotes: [{ total: 20, status: "ISSUED" }],
      lateFees: [{ amount: 15 }],
    });
    assert.equal(summary.amountLateFees, 15);
    assert.equal(summary.remainingInvoice, 95);
    assert.equal(summary.balanceDue, 95);
  });
});
