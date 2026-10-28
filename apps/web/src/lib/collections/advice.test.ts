/**
 * Run: `npx tsx --test src/lib/collections/advice.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatUtcDateLabel } from "../reminders/dates";
import { buildEqualPaymentPlan } from "./advice";

describe("buildEqualPaymentPlan", () => {
  it("splits into equal parts and spaces due dates by intervalDays", () => {
    const plan = buildEqualPaymentPlan(100, 2, new Date("2026-01-01T00:00:00.000Z"), 7);
    assert.equal(plan.length, 2);
    assert.equal(plan[0]?.amount, 50);
    assert.equal(plan[1]?.amount, 50);
    assert.equal(plan[0]?.dueDate, "2026-01-01");
    assert.equal(plan[1]?.dueDate, "2026-01-08");
  });

  it("defaults to 14-day gaps and puts remainder on the last part", () => {
    const plan = buildEqualPaymentPlan(100, 3, new Date("2026-03-01T00:00:00.000Z"));
    assert.equal(plan[0]?.dueDate, "2026-03-01");
    assert.equal(plan[1]?.dueDate, "2026-03-15");
    assert.equal(plan[2]?.dueDate, "2026-03-29");
    assert.equal(plan[0]?.amount, 33.33);
    assert.equal(plan[1]?.amount, 33.33);
    assert.equal(plan[2]?.amount, 33.34);
  });

  it("uses the UTC calendar day even when the start timestamp is later in that day", () => {
    const plan = buildEqualPaymentPlan(90, 2, new Date("2026-01-01T18:00:00.000Z"), 14);
    assert.equal(plan[0]?.dueDate, "2026-01-01");
    assert.equal(plan[1]?.dueDate, "2026-01-15");
  });
});

describe("formatUtcDateLabel", () => {
  it("keeps YYYY-MM-DD on the same calendar day in any local timezone", () => {
    assert.equal(formatUtcDateLabel("2026-01-08"), "Jan 8, 2026");
  });
});
