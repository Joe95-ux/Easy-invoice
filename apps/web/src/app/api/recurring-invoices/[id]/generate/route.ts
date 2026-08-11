import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import {
  getRecurringInvoice,
  issueRecurringInvoiceOccurrence,
  serializeRecurringInvoice,
} from "@/lib/recurring-invoices";

type RouteContext = { params: Promise<{ id: string }> };

/** Manually generate the next invoice now (even if not yet due). */
export async function POST(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const existing = await getRecurringInvoice(id, member.companyId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status === "ENDED") {
    return NextResponse.json(
      { error: "This schedule has ended. Resume or edit it before generating." },
      { status: 400 },
    );
  }

  const result = await issueRecurringInvoiceOccurrence(member.companyId, id, {
    memberId: member.id,
    force: true,
  });

  if (result.error && !result.invoiceId) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const recurringInvoice = await getRecurringInvoice(id, member.companyId);

  return NextResponse.json({
    result,
    recurringInvoice: recurringInvoice
      ? serializeRecurringInvoice(recurringInvoice)
      : null,
  });
}
