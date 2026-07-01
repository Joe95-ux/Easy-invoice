import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  buildInvoiceTotals,
  generateNextInvoiceNumber,
  isUniqueConstraintError,
  resolveClientForInvoice,
} from "@/lib/invoice-service";
import { linkTimeEntriesToInvoice } from "@/lib/time-tracking/service";
import { createInvoiceSchema } from "@/lib/schemas/invoice";
import { getDefaultTemplateId, getTemplateById } from "@/lib/templates";

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const client = await resolveClientForInvoice(member.companyId, parsed.data);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let templateId = parsed.data.templateId;
  if (templateId) {
    const template = await getTemplateById(templateId, member.companyId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
  } else {
    templateId = await getDefaultTemplateId(member.companyId);
  }

  const { lineItems, totals } = buildInvoiceTotals(parsed.data);

  try {
    const invoice = await prisma.invoice.create({
      data: {
        companyId: member.companyId,
        clientId: client.id,
        templateId: templateId ?? null,
        number: await generateNextInvoiceNumber(member.companyId),
        currency: parsed.data.currency,
        subtotal: totals.subtotal,
        taxRate: parsed.data.taxRate,
        taxAmount: totals.taxAmount,
        discount: parsed.data.discount,
        total: totals.total,
        notes: parsed.data.notes,
        issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : new Date(),
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        items: { create: lineItems },
      },
      include: { items: { orderBy: { sortOrder: "asc" } }, client: true },
    });

    await linkTimeEntriesToInvoice(
      member.companyId,
      invoice.id,
      parsed.data.lineItems.map((item, index) => ({
        sortOrder: item.sortOrder ?? index,
        timeEntryIds: item.timeEntryIds,
      })),
    ).catch(async (error) => {
      await prisma.invoice.delete({ where: { id: invoice.id } });
      throw error;
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "Invoice number conflict, please retry" }, { status: 409 });
    }
    throw error;
  }
}
