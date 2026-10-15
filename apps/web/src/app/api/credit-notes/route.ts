import { NextResponse } from "next/server";
import {
  requireApiMember,
  requireApiWriter,
  parseJsonBody,
  validationError,
} from "@/lib/api/validation";
import { createCreditNoteSchema } from "@/lib/schemas/credit-note";
import { createCreditNote, listCreditNotesForMember } from "@/lib/credit-notes";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const creditNotes = await listCreditNotesForMember(member.companyId);
  return NextResponse.json({ creditNotes });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = createCreditNoteSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const creditNote = await createCreditNote({
      companyId: member.companyId,
      memberId: member.id,
      data: parsed.data,
    });
    return NextResponse.json({ creditNote }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create credit note";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
