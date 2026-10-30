/**
 * Run: `npx tsx --test src/lib/dashboard-unpaid.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildUnpaidAttention } from "./dashboard-unpaid";

const today = new Date("2026-10-29T12:00:00.000Z");

function invoice(
  patch: Partial<{
    id: string;
    number: string;
    balanceDue: number;
    dueDate: Date | null;
    clientName: string | null;
  }>,
) {
  return {
    id: patch.id ?? "1",
    number: patch.number ?? "INV-1",
    currency: "USD",
    clientName: patch.clientName ?? "Acme",
    balanceDue: patch.balanceDue ?? 100,
    dueDate: patch.dueDate ?? new Date("2026-10-20T00:00:00.000Z"),
  };
}

describe("buildUnpaidAttention", () => {
  it("counts overdue and due-today invoices and lists the most overdue first", () => {
    const result = buildUnpaidAttention(
      [
        invoice({
          id: "future",
          number: "INV-F",
          dueDate: new Date("2026-11-10T00:00:00.000Z"),
        }),
        invoice({
          id: "today",
          number: "INV-T",
          dueDate: new Date("2026-10-29T00:00:00.000Z"),
          balanceDue: 40,
        }),
        invoice({
          id: "old",
          number: "INV-A",
          dueDate: new Date("2026-10-01T00:00:00.000Z"),
          balanceDue: 80,
        }),
        invoice({
          id: "paid",
          number: "INV-P",
          balanceDue: 0,
        }),
      ],
      today,
    );

    assert.equal(result.count, 2);
    assert.equal(result.overdueCount, 1);
    assert.equal(result.dueTodayCount, 1);
    assert.deepEqual(
      result.previews.map((row) => row.id),
      ["old", "today"],
    );
    assert.equal(result.previews[0]?.isOverdue, true);
    assert.equal(result.previews[1]?.isOverdue, false);
    assert.equal(result.previews[0]?.dueLabel, "Oct 1, 2026");
  });
});
