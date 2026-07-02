import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  buildEstimateTotals,
  generateNextEstimateNumber,
  isUniqueConstraintError,
  resolveClientForEstimate,
} from "@/lib/estimate-service";
import { createEstimateSchema } from "@/lib/schemas/estimate";
import { getDefaultTemplateId, getTemplateById } from "@/lib/templates";
import {
  loadEstimateSnapshot,
  recordDocumentRevision,
} from "@/lib/document-revisions/service";

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = createEstimateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const client = await resolveClientForEstimate(member.companyId, parsed.data);
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

  const { lineItems, totals } = buildEstimateTotals(parsed.data);

  try {
    const estimate = await prisma.estimate.create({
      data: {
        companyId: member.companyId,
        clientId: client.id,
        templateId: templateId ?? null,
        number: await generateNextEstimateNumber(member.companyId),
        currency: parsed.data.currency,
        subtotal: totals.subtotal,
        taxRate: parsed.data.taxRate,
        taxAmount: totals.taxAmount,
        discount: parsed.data.discount,
        total: totals.total,
        notes: parsed.data.notes,
        issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : new Date(),
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        items: { create: lineItems },
      },
      include: { items: true, client: true },
    });

    const snapshot = await loadEstimateSnapshot(member.companyId, estimate.id);
    if (snapshot) {
      await recordDocumentRevision({
        companyId: member.companyId,
        documentType: "ESTIMATE",
        documentId: estimate.id,
        memberId: member.id,
        source: "CREATE",
        snapshot,
        summary: "Document created",
      });
    }

    return NextResponse.json({ estimate }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "Estimate number conflict, please retry" }, { status: 409 });
    }
    throw error;
  }
}
