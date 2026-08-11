import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import {
  createRecurringFromInvoice,
  serializeRecurringInvoice,
} from "@/lib/recurring-invoices";
import { createRecurringFromInvoiceSchema } from "@/lib/schemas/recurring-invoice";

type RouteContext = { params: Promise<{ id: string }> };

/** Create a recurring schedule from an existing invoice’s client, totals, and line items. */
export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = createRecurringFromInvoiceSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const recurringInvoice = await createRecurringFromInvoice(
      member.companyId,
      member.id,
      id,
      parsed.data,
    );
    return NextResponse.json(
      { recurringInvoice: serializeRecurringInvoice(recurringInvoice) },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create recurring schedule";
    const status = message === "Invoice not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
