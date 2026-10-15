import { NextResponse } from "next/server";
import {
  requireApiMember,
  requireApiWriter,
  requireApiDocumentDeleter,
  parseJsonBody,
  validationError,
} from "@/lib/api/validation";
import { updateCreditNoteSchema } from "@/lib/schemas/credit-note";
import {
  cancelCreditNote,
  deleteCreditNote,
  getCreditNoteForMember,
  updateCreditNote,
} from "@/lib/credit-notes";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const creditNote = await getCreditNoteForMember(id, member.companyId);
  if (!creditNote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ creditNote });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = updateCreditNoteSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const creditNote = await updateCreditNote({
      id,
      companyId: member.companyId,
      memberId: member.id,
      data: parsed.data,
    });
    return NextResponse.json({ creditNote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update credit note";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiDocumentDeleter();
  if (response) return response;

  const { id } = await context.params;
  const existing = await getCreditNoteForMember(id, member.companyId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    if (existing.status === "DRAFT") {
      await deleteCreditNote({ id, companyId: member.companyId });
      return NextResponse.json({ ok: true });
    }
    await cancelCreditNote({
      id,
      companyId: member.companyId,
      memberId: member.id,
    });
    return NextResponse.json({ ok: true, cancelled: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete credit note";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
