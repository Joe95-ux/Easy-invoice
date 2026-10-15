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
});
