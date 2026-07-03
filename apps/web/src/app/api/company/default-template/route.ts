import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiCompanyAdmin, parseJsonBody, validationError } from "@/lib/api/validation";
import { recordAuditEvent } from "@/lib/audit/service";
import { AuditAction, AuditCategory, prisma } from "@/lib/db";
import { getTemplateById, setCompanyDefaultTemplate } from "@/lib/templates";

const bodySchema = z.object({
  templateId: z.string().min(1),
});

export async function PATCH(request: Request) {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const company = await prisma.company.findUnique({
    where: { id: member.companyId },
    select: { defaultTemplateId: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const previousTemplate = company.defaultTemplateId
    ? await getTemplateById(company.defaultTemplateId, member.companyId)
    : null;

  try {
    await setCompanyDefaultTemplate(member.companyId, parsed.data.templateId);
  } catch {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const nextTemplate = await getTemplateById(parsed.data.templateId, member.companyId);
  const fromName = previousTemplate?.name ?? "none";
  const toName = nextTemplate?.name ?? parsed.data.templateId;

  await recordAuditEvent({
    companyId: member.companyId,
    memberId: member.id,
    category: AuditCategory.SETTINGS,
    action: AuditAction.DEFAULT_TEMPLATE_CHANGED,
    summary: `Default template: ${fromName} → ${toName}`,
    entityType: "template",
    entityId: parsed.data.templateId,
    metadata: {
      fromTemplateId: company.defaultTemplateId,
      toTemplateId: parsed.data.templateId,
      fromTemplateName: fromName,
      toTemplateName: toName,
    },
  });

  return NextResponse.json({ defaultTemplateId: parsed.data.templateId });
}
