/**
 * Run: `npx tsx --test src/lib/collections/timeline.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCollectionsTimeline,
  collectionsToneForOffset,
  collectionsToneForStep,
} from "./timeline";

const collections = {
  collectionsEnabled: true,
  collectionsDaysAfter: [7, 14, 30],
  collectionsIncludePdf: true,
  collectionsAttachStatement: true,
};

const lateFees = {
  lateFeesEnabled: true,
  lateFeeType: "percent" as const,
  lateFeePercent: 1.5,
  lateFeeFlat: 0,
  lateFeeGraceDays: 7,
};

describe("collectionsToneForStep", () => {
  it("uses notice, firm, then final on a 3-step schedule", () => {
    assert.equal(collectionsToneForStep(0, 3), "notice");
    assert.equal(collectionsToneForStep(1, 3), "firm");
    assert.equal(collectionsToneForStep(2, 3), "final");
  });

  it("treats a single step as a final notice", () => {
    assert.equal(collectionsToneForStep(0, 1), "final");
  });
});

describe("collectionsToneForOffset", () => {
  it("maps schedule days to escalating copy", () => {
    assert.equal(collectionsToneForOffset(7, [7, 14, 30]), "notice");
    assert.equal(collectionsToneForOffset(14, [7, 14, 30]), "firm");
    assert.equal(collectionsToneForOffset(30, [7, 14, 30]), "final");
  });
});

describe("buildCollectionsTimeline", () => {
  const due = new Date("2026-10-01T00:00:00.000Z");

  it("builds notice → firm → final plus a late fee after grace", () => {
    const steps = buildCollectionsTimeline({
      dueDate: due,
      today: new Date("2026-10-05T00:00:00.000Z"),
      collections,
      lateFees,
    });
    assert.deepEqual(
      steps.map((step) => [step.kind, step.offsetDays, step.tone, step.status]),
      [
        ["collections", 7, "notice", "upcoming"],
        ["late_fee", 8, undefined, "upcoming"],
        ["collections", 14, "firm", "upcoming"],
        ["collections", 30, "final", "upcoming"],
      ],
    );
    assert.equal(steps[0]?.attachesStatement, true);
  });

  it("marks a sent collections email and an applied late fee", () => {
    const steps = buildCollectionsTimeline({
      dueDate: due,
      today: new Date("2026-10-12T00:00:00.000Z"),
      collections,
      lateFees,
      reminders: [{ kind: "COLLECTIONS", offsetDays: 7, status: "SENT" }],
      lateFeeAppliedAt: new Date("2026-10-09T00:00:00.000Z"),
      lateFeeAmountLabel: "$12.00",
    });
    assert.equal(steps[0]?.status, "sent");
    const fee = steps.find((step) => step.kind === "late_fee");
    assert.equal(fee?.status, "applied");
    assert.match(fee?.title ?? "", /\$12\.00/);
  });

  it("skips remaining steps when the invoice is settled", () => {
    const steps = buildCollectionsTimeline({
      dueDate: due,
      today: new Date("2026-10-20T00:00:00.000Z"),
      settled: true,
      collections,
      lateFees: { ...lateFees, lateFeesEnabled: false },
      reminders: [{ kind: "COLLECTIONS", offsetDays: 7, status: "SENT" }],
    });
    assert.equal(steps[0]?.status, "sent");
    assert.equal(steps[1]?.status, "skipped");
    assert.equal(steps[2]?.status, "skipped");
  });
});
