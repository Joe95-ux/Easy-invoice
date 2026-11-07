/**
 * Run: `npx tsx --test src/features/credit-notes/lib/export-credit-notes-csv.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CREDIT_NOTE_CSV_HEADERS } from "./export-credit-notes-csv";
import { creditNoteKindLabel, creditNoteStatusLabel } from "@/lib/credit-note-display";

describe("credit notes CSV", () => {
  it("exports the list columns used in the table", () => {
    assert.deepEqual([...CREDIT_NOTE_CSV_HEADERS], [
      "Number",
      "Invoice",
      "Client",
      "Issue date",
      "Kind",
      "Status",
      "Amount",
      "Currency",
    ]);
    assert.equal(creditNoteKindLabel("VOID"), "Void");
    assert.equal(creditNoteStatusLabel("ISSUED"), "Issued");
  });
});
