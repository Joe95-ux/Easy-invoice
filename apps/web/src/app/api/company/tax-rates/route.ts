import { NextResponse } from "next/server";
import {
  requireApiMember,
  requireApiCompanyAdmin,
  parseJsonBody,
  validationError,
} from "@/lib/api/validation";
import { recordAuditEvent } from "@/lib/audit/service";
import { AuditAction, AuditCategory, prisma } from "@/lib/db";
import { updateCompanyTaxRatesSchema } from "@/lib/schemas/tax-rates";
import { normalizeCompanyTaxRates } from "@/lib/tax-rates";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const company = await prisma.company.findUnique({
    where: { id: member.companyId },
    select: { taxRates: true, taxInclusiveDefault: true },
  });

  return NextResponse.json({
    taxRates: normalizeCompanyTaxRates(company?.taxRates),
    taxInclusiveDefault: company?.taxInclusiveDefault ?? false,
  });
}

export async function PATCH(request: Request) {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = updateCompanyTaxRatesSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const taxRates = normalizeCompanyTaxRates(parsed.data.taxRates);
  const taxInclusiveDefault = parsed.data.taxInclusiveDefault ?? false;

  await prisma.company.update({
    where: { id: member.companyId },
    data: {
      taxRates,
      ...(parsed.data.taxInclusiveDefault !== undefined
        ? { taxInclusiveDefault }
        : {}),
    },
  });

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: member.companyId },
    select: { taxRates: true, taxInclusiveDefault: true },
  });

  await recordAuditEvent({
    companyId: member.companyId,
    memberId: member.id,
    category: AuditCategory.SETTINGS,
    action: AuditAction.COMPANY_PROFILE_UPDATED,
    summary: `Updated tax rates (${taxRates.length})`,
    entityType: "company",
    entityId: member.companyId,
    metadata: {
      taxRateCount: taxRates.length,
      taxInclusiveDefault: company.taxInclusiveDefault,
    },
  }).catch(() => undefined);

  return NextResponse.json({
    taxRates: normalizeCompanyTaxRates(company.taxRates),
    taxInclusiveDefault: company.taxInclusiveDefault,
  });
}
