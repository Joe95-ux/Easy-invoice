import { NextResponse } from "next/server";
import { renderInvoicePdf } from "@/lib/ai-docs";
import { renderEstimateHtmlForEstimate } from "@/lib/estimate-html";
import { getEstimateByPublicToken } from "@/lib/public-documents";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const estimate = await getEstimateByPublicToken(token);

  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const html = await renderEstimateHtmlForEstimate(estimate);
  const pdfBuffer = await renderInvoicePdf(html);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${estimate.number}.pdf"`,
    },
  });
}
