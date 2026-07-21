import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { getAppOrigin } from "@/lib/app-url";
import { publicDocumentUrl } from "@/lib/document-tokens";
import { sendInvoiceEmail } from "@/lib/email";
import { generateInvoicePdfBuffer } from "@/lib/invoice-service";
import { formatMoney } from "@/lib/invoices";
import { ensureInvoicePublicToken } from "@/lib/public-documents";
import { recordDocumentRevision } from "@/lib/document-revisions/service";
import { prisma } from "@/lib/db";
import { z } from "zod";

const sendSchema = z.object({
  email: z.string().email().optional(),
  message: z.string().trim().max(2000).optional(),
  subject: z.string().trim().max(200).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const result = await generateInvoicePdfBuffer(id, member.companyId);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { invoice, pdfBuffer } = result;
    const recipientEmail = parsed.data.email ?? invoice.client?.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Client email is required to send the invoice" },
        { status: 400 },
      );
    }

    await sendInvoiceEmail({
      to: recipientEmail,
      companyName: invoice.company.name,
      invoiceNumber: invoice.number,
      total: formatMoney(invoice.total, invoice.currency),
      pdfBuffer,
      viewUrl: publicDocumentUrl(
        await getAppOrigin(),
        "invoice",
        (await ensureInvoicePublicToken(id, member.companyId))!,
      ),
      message: parsed.data.message,
      subject: parsed.data.subject,
    });

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
        sentAt: invoice.sentAt ?? new Date(),
      },
      include: {
        client: true,
        items: { orderBy: { sortOrder: "asc" } },
        company: true,
        template: true,
      },
    });

    await recordDocumentRevision({
      companyId: member.companyId,
      documentType: "INVOICE",
      documentId: id,
      memberId: member.id,
      source: "SEND",
      summary: `Sent to ${recipientEmail}`,
      metadata: {
        email: recipientEmail,
        ...(parsed.data.message ? { message: parsed.data.message } : {}),
      },
    });

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send invoice";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
