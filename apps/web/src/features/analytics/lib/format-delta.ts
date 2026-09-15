import { formatMoney } from "@/lib/invoices";

/** Short prior-period comparison line for KPI cards. */
export function formatDeltaHint(
  change: number,
  changePct: number | null,
  currency: string,
): string {
  if (change === 0) return "Flat vs prior period";

  const money = formatMoney(change, currency);
  const signedMoney = change > 0 ? `+${money.replace(/^-/, "")}` : money;

  if (changePct === null) {
    return change > 0 ? `${signedMoney} vs prior (new)` : `${signedMoney} vs prior`;
  }

  const sign = changePct > 0 ? "+" : "";
  return `${signedMoney} (${sign}${changePct}%) vs prior`;
}
