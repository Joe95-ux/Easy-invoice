import { NextResponse } from "next/server";
import {
  requireApiMember,
  requireApiCompanyAdmin,
  parseJsonBody,
  validationError,
} from "@/lib/api/validation";
import { recordAuditEvent } from "@/lib/audit/service";
import { AuditAction, AuditCategory, prisma } from "@/lib/db";
import {
  companyFxSettingsSchema,
  normalizeCompanyFxSettings,
  type CompanyFxSettings,
} from "@/lib/schemas/fx-settings";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const company = await prisma.company.findUnique({
    where: { id: member.companyId },
    select: {
      currency: true,
      fxPreferredSource: true,
      fxStaleDays: true,
      fxShowOnPdf: true,
      fxLockOnSend: true,
      fxAutoFetch: true,
    },
  });

  return NextResponse.json({
    currency: company?.currency ?? "USD",
    ...normalizeCompanyFxSettings({
      fxPreferredSource: company?.fxPreferredSource as CompanyFxSettings["fxPreferredSource"],
      fxStaleDays: company?.fxStaleDays,
      fxShowOnPdf: company?.fxShowOnPdf,
      fxLockOnSend: company?.fxLockOnSend,
      fxAutoFetch: company?.fxAutoFetch,
    }),
  });
}

export async function PATCH(request: Request) {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = companyFxSettingsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const data: Record<string, unknown> = {};
  if (parsed.data.fxPreferredSource !== undefined) {
    data.fxPreferredSource = parsed.data.fxPreferredSource;
  }
  if (parsed.data.fxStaleDays !== undefined) {
    data.fxStaleDays = parsed.data.fxStaleDays;
  }
  if (parsed.data.fxShowOnPdf !== undefined) {
    data.fxShowOnPdf = parsed.data.fxShowOnPdf;
  }
  if (parsed.data.fxLockOnSend !== undefined) {
    data.fxLockOnSend = parsed.data.fxLockOnSend;
  }
  if (parsed.data.fxAutoFetch !== undefined) {
    data.fxAutoFetch = parsed.data.fxAutoFetch;
  }

  const company = await prisma.company.update({
    where: { id: member.companyId },
    data,
    select: {
      currency: true,
      fxPreferredSource: true,
      fxStaleDays: true,
      fxShowOnPdf: true,
      fxLockOnSend: true,
      fxAutoFetch: true,
    },
  });

  const settings = normalizeCompanyFxSettings({
    fxPreferredSource: company.fxPreferredSource as CompanyFxSettings["fxPreferredSource"],
    fxStaleDays: company.fxStaleDays,
    fxShowOnPdf: company.fxShowOnPdf,
    fxLockOnSend: company.fxLockOnSend,
    fxAutoFetch: company.fxAutoFetch,
  });

  await recordAuditEvent({
    companyId: member.companyId,
    memberId: member.id,
    category: AuditCategory.SETTINGS,
    action: AuditAction.COMPANY_PROFILE_UPDATED,
    summary: "Updated currency / FX settings",
    entityType: "company",
    entityId: member.companyId,
    metadata: settings,
  }).catch(() => undefined);

  return NextResponse.json({
    currency: company.currency,
    ...settings,
  });
}
