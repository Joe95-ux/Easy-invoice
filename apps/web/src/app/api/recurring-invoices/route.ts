import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import {
  createRecurringInvoice,
  listRecurringInvoices,
  serializeRecurringInvoice,
} from "@/lib/recurring-invoices";
import { createRecurringInvoiceSchema } from "@/lib/schemas/recurring-invoice";
import type { RecurringInvoiceStatus } from "@easy-invoice/db";
import {
  assertProFeature,
  isPlanLimitError,
  planLimitResponse,
} from "@/lib/billing/entitlements";

export async function GET(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as RecurringInvoiceStatus | null;
  const allowed = status && ["ACTIVE", "PAUSED", "ENDED"].includes(status) ? status : undefined;

  const rows = await listRecurringInvoices(member.companyId, {
    status: allowed,
  });

  return NextResponse.json({
    recurringInvoices: rows.map(serializeRecurringInvoice),
  });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = createRecurringInvoiceSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    assertProFeature(member.company.plan, "recurring_invoices");
    const recurringInvoice = await createRecurringInvoice(
      member.companyId,
      member.id,
      parsed.data,
    );
    return NextResponse.json(
      { recurringInvoice: serializeRecurringInvoice(recurringInvoice) },
      { status: 201 },
    );
  } catch (error) {
    if (isPlanLimitError(error)) return planLimitResponse(error);
    const message =
      error instanceof Error ? error.message : "Failed to create recurring invoice";
    const status =
      message === "Client not found" || message === "Template not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
