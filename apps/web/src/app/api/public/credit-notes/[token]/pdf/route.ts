import { NextResponse } from "next/server";
import { renderInvoicePdf } from "@/lib/ai-docs";
import { renderCreditNoteHtml } from "@/lib/credit-note-html";
import { getCreditNoteByPublicToken } from "@/lib/public-documents";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const creditNote = await getCreditNoteByPublicToken(token);
  if (!creditNote || creditNote.status === "DRAFT") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const html = await renderCreditNoteHtml(creditNote);
  const pdfBuffer = await renderInvoicePdf(html);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${creditNote.number}.pdf"`,
    },
  });
}
