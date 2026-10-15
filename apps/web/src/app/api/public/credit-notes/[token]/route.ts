import { NextResponse } from "next/server";
import { getCreditNoteByPublicToken } from "@/lib/public-documents";
import { renderCreditNoteHtml } from "@/lib/credit-note-html";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const creditNote = await getCreditNoteByPublicToken(token);
  if (!creditNote || creditNote.status === "DRAFT") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const html = await renderCreditNoteHtml(creditNote);
  return NextResponse.json({
    number: creditNote.number,
    html,
    invoiceNumber: creditNote.invoice.number,
  });
}
