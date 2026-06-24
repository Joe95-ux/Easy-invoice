import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { generateInvoicePdfBuffer } from "@/lib/invoice-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;

  try {
    const result = await generateInvoicePdfBuffer(id, member.companyId);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.invoice.number}.pdf"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
