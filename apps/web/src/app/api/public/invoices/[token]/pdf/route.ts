import { NextResponse } from "next/server";
import { renderInvoicePdf } from "@/lib/ai-docs";
import { renderInvoiceHtmlForInvoice } from "@/lib/invoice-html";
import { getInvoiceByPublicToken } from "@/lib/public-documents";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const invoice = await getInvoiceByPublicToken(token);

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const html = await renderInvoiceHtmlForInvoice(invoice);
  const pdfBuffer = await renderInvoicePdf(html);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
    },
  });
}
