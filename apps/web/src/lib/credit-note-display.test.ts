/**
 * Run: `npx tsx --test src/lib/credit-note-display.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  creditNoteKindLabel,
  creditNoteStatusLabel,
  serializeCreditNoteListRow,
} from "./credit-note-display";

describe("credit note display", () => {
  it("labels status and kind for the list", () => {
    assert.equal(creditNoteStatusLabel("DRAFT"), "Draft");
    assert.equal(creditNoteStatusLabel("ISSUED"), "Issued");
    assert.equal(creditNoteStatusLabel("CANCELLED"), "Cancelled");
    assert.equal(creditNoteKindLabel("CREDIT"), "Credit");
    assert.equal(creditNoteKindLabel("VOID"), "Void");
  });

  it("serializes list rows without a silent cap shape", () => {
    const row = serializeCreditNoteListRow({
      id: "cn_1",
      number: "CN-0001",
      status: "ISSUED",
      kind: "CREDIT",
      total: { toString: () => "150.00" },
      currency: "USD",
      issueDate: new Date("2026-03-04T00:00:00.000Z"),
      client: { name: "Acme" },
      invoice: { id: "inv_1", number: "INV-0009" },
    });
    assert.equal(row.number, "CN-0001");
    assert.equal(row.total, "150.00");
    assert.equal(row.clientName, "Acme");
    assert.equal(row.invoiceNumber, "INV-0009");
    assert.equal(row.issueDate, "2026-03-04");
  });

  it("uses the UTC calendar day when the stored timestamp has a time", () => {
    const row = serializeCreditNoteListRow({
      id: "cn_2",
      number: "CN-0002",
      status: "DRAFT",
      kind: "VOID",
      total: 10,
      currency: "USD",
      issueDate: new Date("2026-03-04T22:15:00.000Z"),
      client: null,
      invoice: { id: "inv_2", number: "INV-0010" },
    });
    assert.equal(row.issueDate, "2026-03-04");
    assert.equal(row.clientName, null);
  });
});
