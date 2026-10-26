/**
 * Run: `npx tsx --test src/lib/support.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { supportEmailSubject } from "./support";

describe("supportEmailSubject", () => {
  it("tags Pro requests for the support inbox", () => {
    assert.equal(
      supportEmailSubject("Card declined", true),
      "[Pro priority] Invoice Desk support: Card declined",
    );
  });

  it("keeps the standard subject for Free", () => {
    assert.equal(
      supportEmailSubject("Card declined", false),
      "Invoice Desk support: Card declined",
    );
  });
});
