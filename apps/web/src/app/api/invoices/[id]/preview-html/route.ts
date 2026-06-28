import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { renderInvoiceHtmlForInvoice } from "@/lib/invoice-html";
import { getInvoiceForMember } from "@/lib/invoices";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const invoice = await getInvoiceForMember(id, member.companyId);
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const html = await renderInvoiceHtmlForInvoice(invoice);

  return NextResponse.json({
    html,
    invoice: {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      clientEmail: invoice.client?.email ?? null,
    },
  });
}
