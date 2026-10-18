/**
 * Run: `npx tsx --test apps/web/src/lib/collections/settings.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeLateFeeAmount } from "./settings";

describe("late fee amount", () => {
  it("applies a percent of remaining", () => {
    assert.equal(computeLateFeeAmount(200, { lateFeeType: "percent", lateFeePercent: 1.5, lateFeeFlat: 0 }), 3);
  });

  it("applies a flat amount", () => {
    assert.equal(computeLateFeeAmount(200, { lateFeeType: "flat", lateFeePercent: 1.5, lateFeeFlat: 25 }), 25);
  });
});
