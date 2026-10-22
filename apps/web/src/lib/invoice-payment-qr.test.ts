/**
 * Run: `npx tsx --test src/lib/invoice-payment-qr.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { paymentQrMethodLabel, paymentQrName } from "./invoice-payment-qr";

describe("paymentQrName", () => {
  it("includes the invoice number and method", () => {
    assert.equal(paymentQrName("INV-12", "PayPal"), "Pay INV-12 · PayPal");
  });
});

describe("paymentQrMethodLabel", () => {
  it("reads the method from a generated name", () => {
    assert.equal(paymentQrMethodLabel("Pay INV-12 · PayPal"), "PayPal");
  });

  it("falls back when the name has no separator", () => {
    assert.equal(paymentQrMethodLabel("Scan to pay"), "Payment link");
  });
});
