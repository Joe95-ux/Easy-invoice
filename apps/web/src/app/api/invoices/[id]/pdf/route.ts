import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { renderInvoicePdf } from "@/lib/ai-docs";
import { getCurrentMember } from "@/lib/auth";
import { invoiceToHtmlData, renderInvoiceHtml } from "@/lib/invoice-html";
import { getInvoiceForMember } from "@/lib/invoices";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const { id } = await context.params;
  const invoice = await getInvoiceForMember(id, member.companyId);

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const html = renderInvoiceHtml(invoiceToHtmlData(invoice));
    const pdfBuffer = await renderInvoicePdf(html);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
