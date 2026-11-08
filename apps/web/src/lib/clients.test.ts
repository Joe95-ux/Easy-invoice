/**
 * Run: `npx tsx --test src/lib/clients.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientArchiveWhere } from "./schemas/client";

describe("clientArchiveWhere", () => {
  it("keeps the working list on active clients", () => {
    assert.deepEqual(clientArchiveWhere("active"), { archivedAt: null });
  });

  it("selects only archived clients", () => {
    assert.deepEqual(clientArchiveWhere("archived"), { archivedAt: { not: null } });
  });

  it("returns no archive clause for all", () => {
    assert.deepEqual(clientArchiveWhere("all"), {});
  });
});
