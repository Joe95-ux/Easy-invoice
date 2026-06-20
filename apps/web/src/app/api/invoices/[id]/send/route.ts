import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { renderInvoicePdf } from "@/lib/ai-docs";
import { getCurrentMember } from "@/lib/auth";
import { sendInvoiceEmail } from "@/lib/email";
import { invoiceToHtmlData, renderInvoiceHtml } from "@/lib/invoice-html";
import { formatMoney, getInvoiceForMember } from "@/lib/invoices";
import { prisma } from "@/lib/db";

const sendSchema = z.object({
  email: z.string().email().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
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

  const body = await request.json().catch(() => ({}));
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const recipientEmail = parsed.data.email ?? invoice.client?.email;
  if (!recipientEmail) {
    return NextResponse.json(
      { error: "Client email is required to send the invoice" },
      { status: 400 },
    );
  }

  try {
    const html = renderInvoiceHtml(invoiceToHtmlData(invoice));
    const pdfBuffer = await renderInvoicePdf(html);

    await sendInvoiceEmail({
      to: recipientEmail,
      companyName: invoice.company.name,
      invoiceNumber: invoice.number,
      total: formatMoney(invoice.total, invoice.currency),
      pdfBuffer,
    });

    if (parsed.data.email && invoice.clientId) {
      await prisma.client.update({
        where: { id: invoice.clientId },
        data: { email: parsed.data.email },
      });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
        sentAt: invoice.sentAt ?? new Date(),
      },
      include: { client: true, items: { orderBy: { sortOrder: "asc" } }, company: true },
    });

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send invoice";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
