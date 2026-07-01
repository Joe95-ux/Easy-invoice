import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  buildInvoiceTotals,
  canTransitionInvoiceStatus,
  resolveClientForInvoice,
} from "@/lib/invoice-service";
import { getInvoiceForMember } from "@/lib/invoices";
import { releaseTimeEntriesForInvoice, linkTimeEntriesToInvoice } from "@/lib/time-tracking/service";
import { updateInvoiceSchema } from "@/lib/schemas/invoice";
import { getTemplateById } from "@/lib/templates";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const invoice = await getInvoiceForMember(id, member.companyId);
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const existing = await getInvoiceForMember(id, member.companyId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = updateInvoiceSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;

  if (data.status && !canTransitionInvoiceStatus(existing.status, data.status)) {
    return NextResponse.json(
      { error: `Cannot change status from ${existing.status} to ${data.status}` },
      { status: 400 },
    );
  }

  if (data.templateId) {
    const template = await getTemplateById(data.templateId, member.companyId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
  }

  let clientId = existing.clientId;
  if (data.clientName) {
    const client = await resolveClientForInvoice(member.companyId, {
      clientId: data.clientId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      clientAddress: data.clientAddress,
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    clientId = client.id;
    if (data.clientEmail && client.id) {
      await prisma.client.update({
        where: { id: client.id },
        data: { email: data.clientEmail },
      });
    }
  } else if (data.clientEmail && existing.clientId) {
    await prisma.client.update({
      where: { id: existing.clientId },
      data: { email: data.clientEmail },
    });
  }

  const hasLineItems = data.lineItems && data.lineItems.length > 0;
  let totalsUpdate: Record<string, number> = {};

  if (
    hasLineItems &&
    data.lineItems &&
    data.currency &&
    data.taxRate !== undefined &&
    data.discount !== undefined
  ) {
    const { lineItems, totals } = buildInvoiceTotals({
      clientName: data.clientName ?? existing.client?.name ?? "Client",
      currency: data.currency,
      taxRate: data.taxRate,
      discount: data.discount,
      lineItems: data.lineItems,
    });
    totalsUpdate = {
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      total: totals.total,
    };

    await releaseTimeEntriesForInvoice(id);
    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
    await prisma.invoiceLineItem.createMany({
      data: lineItems.map((item) => ({
        invoiceId: id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        sortOrder: item.sortOrder,
      })),
    });

    if (existing.status === "DRAFT") {
      await linkTimeEntriesToInvoice(
        member.companyId,
        id,
        data.lineItems.map((item, index) => ({
          sortOrder: item.sortOrder ?? index,
          timeEntryIds: item.timeEntryIds,
        })),
      );
    }
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.dueDate !== undefined && {
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      }),
      ...(data.templateId !== undefined && { templateId: data.templateId }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
      ...(data.discount !== undefined && { discount: data.discount }),
      ...(data.issueDate !== undefined && {
        issueDate: data.issueDate ? new Date(data.issueDate) : existing.issueDate,
      }),
      ...(clientId !== undefined && { clientId }),
      ...totalsUpdate,
      ...(data.status === "PAID" && { paidAt: new Date() }),
      ...(data.status === "SENT" && !existing.sentAt && { sentAt: new Date() }),
      ...(data.remindersPaused !== undefined && { remindersPaused: data.remindersPaused }),
    },
    include: {
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
      company: true,
      template: true,
    },
  });

  return NextResponse.json({ invoice });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const existing = await getInvoiceForMember(id, member.companyId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await releaseTimeEntriesForInvoice(id);
  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
