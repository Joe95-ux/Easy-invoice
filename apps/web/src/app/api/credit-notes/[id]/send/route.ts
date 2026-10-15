import { NextResponse } from "next/server";
import { requireApiWriter, parseJsonBody, validationError } from "@/lib/api/validation";
import { getAppOrigin } from "@/lib/app-url";
import { publicDocumentUrl } from "@/lib/document-tokens";
import { sendCreditNoteEmail } from "@/lib/email";
import { generateCreditNotePdfBuffer } from "@/lib/credit-note-html";
import { issueCreditNote } from "@/lib/credit-notes";
import { formatMoney } from "@/lib/invoices";
import { portalLoginUrl } from "@/lib/portal/urls";
import { ensureCreditNotePublicToken } from "@/lib/public-documents";
import { prisma } from "@/lib/db";
import { sendCreditNoteSchema } from "@/lib/schemas/credit-note";
import {
  assertProFeature,
  isPlanLimitError,
  planLimitResponse,
} from "@/lib/billing/entitlements";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = sendCreditNoteSchema.safeParse(body ?? {});
  if (!parsed.success) return validationError(parsed.error);

  try {
    assertProFeature(member.company.plan, "email_invoices");
  } catch (error) {
    if (isPlanLimitError(error)) return planLimitResponse(error);
    throw error;
  }

  try {
    const issued = await issueCreditNote({
      id,
      companyId: member.companyId,
      memberId: member.id,
    });
    if (!issued) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = await generateCreditNotePdfBuffer(id, member.companyId);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { creditNote, pdfBuffer } = result;
    const recipientEmail = parsed.data.email ?? creditNote.client?.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Client email is required to send the credit note" },
        { status: 400 },
      );
    }

    const origin = await getAppOrigin();
    await sendCreditNoteEmail({
      to: recipientEmail,
      companyName: creditNote.company.name,
      creditNoteNumber: creditNote.number,
      invoiceNumber: creditNote.invoice.number,
      total: formatMoney(creditNote.total, creditNote.currency),
      pdfBuffer,
      viewUrl: publicDocumentUrl(
        origin,
        "credit_note",
        (await ensureCreditNotePublicToken(id, member.companyId))!,
      ),
      portalUrl: portalLoginUrl(origin, recipientEmail),
      message: parsed.data.message,
      subject: parsed.data.subject,
      replyTo: creditNote.company.email,
    });

    const updated = await prisma.creditNote.update({
      where: { id },
      data: { sentAt: creditNote.sentAt ?? new Date() },
      include: {
        client: true,
        invoice: { select: { id: true, number: true } },
      },
    });

    return NextResponse.json({ creditNote: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send credit note";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
