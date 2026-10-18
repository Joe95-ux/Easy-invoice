import { AuditAction, AuditCategory, prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit/service";
import { assertProFeature } from "@/lib/billing/entitlements";
import {
  computeLateFeeAmount,
  lateFeeSettingsFromCompany,
} from "@/lib/collections/settings";
import { daysUntilDue, startOfUtcDay } from "@/lib/reminders/dates";
import {
  buildInvoicePaymentSummary,
  invoiceSettlementInclude,
} from "@/lib/invoice-payments-utils";
import { refreshInvoicePaymentStatus } from "@/lib/invoice-payments";

export async function applyInvoiceLateFee(input: {
  invoiceId: string;
  companyId: string;
  memberId?: string | null;
  source: "AUTO" | "MANUAL";
  reason?: string | null;
  today?: Date;
}) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, companyId: input.companyId },
    include: {
      company: true,
      ...invoiceSettlementInclude,
    },
  });
  if (!invoice) throw new Error("Invoice not found");

  assertProFeature(invoice.company.plan, "late_fees");

  const settings = lateFeeSettingsFromCompany(invoice.company);
  if (input.source === "AUTO" && !settings.lateFeesEnabled) {
    return null;
  }
  if (["DRAFT", "CANCELLED", "CREDITED", "PAID"].includes(invoice.status)) {
    if (input.source === "MANUAL") {
      throw new Error("Late fees cannot be added to this invoice");
    }
    return null;
  }
  if (invoice.lateFees.length > 0) {
    if (input.source === "MANUAL") {
      throw new Error("A late fee is already on this invoice");
    }
    return null;
  }

  const today = startOfUtcDay(input.today ?? new Date());
  const summary = buildInvoicePaymentSummary(invoice, today);
  if (summary.balanceDue <= 0.001) {
    if (input.source === "MANUAL") throw new Error("There is no outstanding balance to apply a late fee to");
    return null;
  }

  const due = summary.nextDueDate ?? invoice.dueDate;
  if (!due) {
    if (input.source === "MANUAL") throw new Error("Invoice has no due date");
    return null;
  }
  const pastDue = -daysUntilDue(today, due);
  if (pastDue <= settings.lateFeeGraceDays) {
    if (input.source === "MANUAL") {
      throw new Error(
        settings.lateFeeGraceDays > 0
          ? `Late fees apply after ${settings.lateFeeGraceDays} day(s) past due`
          : "Invoice is not past due",
      );
    }
    return null;
  }

  const amount = computeLateFeeAmount(summary.balanceDue, settings);
  if (amount <= 0.001) {
    if (input.source === "MANUAL") throw new Error("Late fee amount must be greater than zero");
    return null;
  }

  const created = await prisma.invoiceLateFee.create({
    data: {
      invoiceId: invoice.id,
      companyId: input.companyId,
      memberId: input.memberId ?? null,
      amount,
      source: input.source,
      reason:
        input.reason?.trim() ||
        (input.source === "AUTO"
          ? `Automatic late fee (${settings.lateFeeType === "flat" ? "flat" : `${settings.lateFeePercent}%`})`
          : "Late fee applied"),
    },
  });

  await refreshInvoicePaymentStatus(invoice.id, input.companyId).catch(() => undefined);
  await recordAuditEvent({
    companyId: input.companyId,
    memberId: input.memberId ?? null,
    category: AuditCategory.DOCUMENT,
    action: AuditAction.LATE_FEE_APPLIED,
    summary: `Applied ${amount.toFixed(2)} ${invoice.currency} late fee on invoice ${invoice.number}`,
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: { amount, source: input.source, lateFeeId: created.id },
  });

  return created;
}
