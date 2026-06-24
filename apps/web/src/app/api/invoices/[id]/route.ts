import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { canTransitionInvoiceStatus } from "@/lib/invoice-service";
import { getInvoiceForMember } from "@/lib/invoices";
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

  const { status, notes, dueDate, clientEmail, templateId } = parsed.data;

  if (status && !canTransitionInvoiceStatus(existing.status, status)) {
    return NextResponse.json(
      { error: `Cannot change status from ${existing.status} to ${status}` },
      { status: 400 },
    );
  }

  if (templateId) {
    const template = await getTemplateById(templateId, member.companyId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
  }

  if (clientEmail && existing.clientId) {
    await prisma.client.update({
      where: { id: existing.clientId },
      data: { email: clientEmail },
    });
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(templateId !== undefined && { templateId }),
      ...(status === "PAID" && { paidAt: new Date() }),
      ...(status === "SENT" && !existing.sentAt && { sentAt: new Date() }),
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

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
