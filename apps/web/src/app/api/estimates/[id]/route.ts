import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  buildEstimateTotals,
  canTransitionEstimateStatus,
  resolveClientForEstimate,
} from "@/lib/estimate-service";
import { getEstimateForMember } from "@/lib/estimates";
import { updateEstimateSchema } from "@/lib/schemas/estimate";
import { getTemplateById } from "@/lib/templates";
import {
  loadEstimateSnapshot,
  recordEstimateContentRevision,
} from "@/lib/document-revisions/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const estimate = await getEstimateForMember(id, member.companyId);
  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ estimate });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const existing = await getEstimateForMember(id, member.companyId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = updateEstimateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;
  const beforeSnapshot = await loadEstimateSnapshot(member.companyId, id);

  if (data.status && !canTransitionEstimateStatus(existing.status, data.status)) {
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
    const clientData = {
      clientId: data.clientId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      clientAddress: data.clientAddress,
    };
    const client = await resolveClientForEstimate(member.companyId, clientData);
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
    const { lineItems, totals } = buildEstimateTotals({
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

    await prisma.estimateLineItem.deleteMany({ where: { estimateId: id } });
    await prisma.estimateLineItem.createMany({
      data: lineItems.map((item) => ({
        estimateId: id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        sortOrder: item.sortOrder,
      })),
    });
  }

  const estimate = await prisma.estimate.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.validUntil !== undefined && {
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
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
      ...(data.status === "ACCEPTED" && { acceptedAt: new Date() }),
      ...(data.status === "SENT" && !existing.sentAt && { sentAt: new Date() }),
    },
    include: {
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
      company: true,
      template: true,
    },
  });

  const afterSnapshot = await loadEstimateSnapshot(member.companyId, id);
  if (afterSnapshot) {
    await recordEstimateContentRevision(
      member.companyId,
      id,
      member.id,
      beforeSnapshot,
      afterSnapshot,
    );
  }

  return NextResponse.json({ estimate });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const existing = await getEstimateForMember(id, member.companyId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.estimate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
