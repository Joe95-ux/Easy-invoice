import { NextResponse } from "next/server";
import { requireApiWriter, parseJsonBody, validationError } from "@/lib/api/validation";
import { issueCreditNoteSchema } from "@/lib/schemas/credit-note";
import { issueCreditNote } from "@/lib/credit-notes";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = issueCreditNoteSchema.safeParse(body ?? {});
  if (!parsed.success) return validationError(parsed.error);

  try {
    const creditNote = await issueCreditNote({
      id,
      companyId: member.companyId,
      memberId: member.id,
      issueDate: parsed.data.issueDate,
    });
    if (!creditNote) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ creditNote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not issue credit note";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
