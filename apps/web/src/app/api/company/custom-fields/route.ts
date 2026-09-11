import { NextResponse } from "next/server";
import { requireApiMember, requireApiCompanyAdmin, parseJsonBody, validationError } from "@/lib/api/validation";
import { recordAuditEvent } from "@/lib/audit/service";
import { normalizeCustomFieldDefinitions } from "@/lib/custom-fields";
import { AuditAction, AuditCategory, prisma } from "@/lib/db";
import { updateCustomFieldDefinitionsSchema } from "@/lib/schemas/custom-fields";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const company = await prisma.company.findUnique({
    where: { id: member.companyId },
    select: { customFieldDefinitions: true },
  });

  return NextResponse.json({
    definitions: normalizeCustomFieldDefinitions(company?.customFieldDefinitions),
  });
}

export async function PATCH(request: Request) {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = updateCustomFieldDefinitionsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const definitions = normalizeCustomFieldDefinitions(parsed.data.definitions);

  await prisma.company.update({
    where: { id: member.companyId },
    data: { customFieldDefinitions: definitions },
  });

  await recordAuditEvent({
    companyId: member.companyId,
    memberId: member.id,
    category: AuditCategory.SETTINGS,
    action: AuditAction.COMPANY_PROFILE_UPDATED,
    summary: `Updated custom fields (${definitions.length})`,
    entityType: "company",
    entityId: member.companyId,
    metadata: { customFieldCount: definitions.length },
  }).catch(() => undefined);

  return NextResponse.json({ definitions });
}
