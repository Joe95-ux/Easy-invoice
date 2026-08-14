import { NextResponse } from "next/server";
import { z } from "zod";
import {
  parseJsonBody,
  requireApiCompanyAdmin,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import { recordAuditEvent } from "@/lib/audit/service";
import { AuditAction, AuditCategory, prisma } from "@/lib/db";

const schema = z.object({
  clientPaymentPlansEnabled: z.boolean(),
});

export async function GET() {
  const authResult = await requireApiMember();
  if (authResult.response) return authResult.response;

  const company = await prisma.company.findUnique({
    where: { id: authResult.member.companyId },
    select: { clientPaymentPlansEnabled: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({
    clientPaymentPlansEnabled: company.clientPaymentPlansEnabled,
  });
}

export async function PATCH(request: Request) {
  const authResult = await requireApiCompanyAdmin();
  if (authResult.response) return authResult.response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = schema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const before = await prisma.company.findUnique({
    where: { id: authResult.member.companyId },
    select: { clientPaymentPlansEnabled: true },
  });
  if (!before) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const company = await prisma.company.update({
    where: { id: authResult.member.companyId },
    data: { clientPaymentPlansEnabled: parsed.data.clientPaymentPlansEnabled },
    select: { clientPaymentPlansEnabled: true },
  });

  if (before.clientPaymentPlansEnabled !== company.clientPaymentPlansEnabled) {
    await recordAuditEvent({
      companyId: authResult.member.companyId,
      memberId: authResult.member.id,
      category: AuditCategory.SETTINGS,
      action: AuditAction.COMPANY_PROFILE_UPDATED,
      summary: company.clientPaymentPlansEnabled
        ? "Enabled client self-serve payment plans"
        : "Disabled client self-serve payment plans",
      entityType: "company",
      entityId: authResult.member.companyId,
      metadata: {
        changes: [
          {
            field: "clientPaymentPlansEnabled",
            from: before.clientPaymentPlansEnabled,
            to: company.clientPaymentPlansEnabled,
          },
        ],
      },
    });
  }

  return NextResponse.json({
    clientPaymentPlansEnabled: company.clientPaymentPlansEnabled,
  });
}
