import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { generateReceiptPdfBuffer } from "@/lib/receipt-service";

type RouteContext = { params: Promise<{ id: string; paymentId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id, paymentId } = await context.params;

  const payment = await prisma.invoicePayment.findFirst({
    where: {
      id: paymentId,
      invoiceId: id,
      invoice: { companyId: member.companyId },
    },
    select: { receiptNumber: true },
  });

  if (!payment?.receiptNumber) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await generateReceiptPdfBuffer(paymentId, member.companyId);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(result.pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${payment.receiptNumber}.pdf"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
