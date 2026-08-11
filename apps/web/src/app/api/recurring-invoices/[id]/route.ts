import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import {
  deleteRecurringInvoice,
  getRecurringInvoice,
  serializeRecurringInvoice,
  setRecurringInvoiceStatus,
  updateRecurringInvoice,
} from "@/lib/recurring-invoices";
import { updateRecurringInvoiceSchema } from "@/lib/schemas/recurring-invoice";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const row = await getRecurringInvoice(id, member.companyId);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ recurringInvoice: serializeRecurringInvoice(row) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const statusOnly = z
    .object({ status: z.enum(["ACTIVE", "PAUSED", "ENDED"]) })
    .safeParse(body);

  // Allow `{ status }` alone for pause / resume / end without full schema.
  if (
    statusOnly.success &&
    body &&
    typeof body === "object" &&
    Object.keys(body as object).length === 1
  ) {
    try {
      const updated = await setRecurringInvoiceStatus(
        member.companyId,
        id,
        statusOnly.data.status,
      );
      if (!updated) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({
        recurringInvoice: serializeRecurringInvoice(updated),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update status";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const parsed = updateRecurringInvoiceSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const updated = await updateRecurringInvoice(member.companyId, id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      recurringInvoice: serializeRecurringInvoice(updated),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update recurring invoice";
    const status =
      message === "Client not found" || message === "Template not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const deleted = await deleteRecurringInvoice(member.companyId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
