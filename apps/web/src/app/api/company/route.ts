import { NextResponse } from "next/server";
import { requireApiMember, requireApiCompanyAdmin, parseJsonBody, validationError } from "@/lib/api/validation";
import { recordAuditEvent } from "@/lib/audit/service";
import { summarizeCompanyProfileChange } from "@/lib/audit/summaries";
import { AuditAction, AuditCategory, prisma } from "@/lib/db";
import { companySettingsSchema } from "@/lib/schemas/company";

const PROFILE_AUDIT_FIELDS = [
  "name",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "zip",
  "country",
  "currency",
  "locale",
  "taxId",
  "logoBg",
  "logoPlacement",
  "brandColor",
  "defaultHourlyRate",
  "documentPrefix",
] as const;

function companyProfileSnapshot(company: Record<string, unknown>) {
  return Object.fromEntries(
    PROFILE_AUDIT_FIELDS.map((field) => [
      field,
      field === "defaultHourlyRate" && company[field] != null
        ? Number(company[field])
        : company[field],
    ]),
  );
}

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  return NextResponse.json({ company: member.company });
}

export async function PATCH(request: Request) {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = companySettingsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const before = await prisma.company.findUnique({
    where: { id: member.companyId },
  });
  if (!before) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const company = await prisma.company.update({
    where: { id: member.companyId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      zip: parsed.data.zip || null,
      country: parsed.data.country,
      currency: parsed.data.currency,
      locale: parsed.data.locale,
      taxId: parsed.data.taxId || null,
      ...(parsed.data.logoBg !== undefined && { logoBg: parsed.data.logoBg }),
      ...(parsed.data.logoPlacement !== undefined && {
        logoPlacement: parsed.data.logoPlacement,
      }),
      ...(parsed.data.brandColor !== undefined && {
        brandColor: parsed.data.brandColor,
      }),
      ...(parsed.data.defaultHourlyRate !== undefined && {
        defaultHourlyRate: parsed.data.defaultHourlyRate,
      }),
      ...(parsed.data.documentPrefix !== undefined && {
        documentPrefix: parsed.data.documentPrefix,
      }),
    },
  });

  const { summary, changes } = summarizeCompanyProfileChange(
    companyProfileSnapshot(before as Record<string, unknown>),
    companyProfileSnapshot(company as Record<string, unknown>),
  );

  if (changes.length > 0) {
    await recordAuditEvent({
      companyId: member.companyId,
      memberId: member.id,
      category: AuditCategory.SETTINGS,
      action: AuditAction.COMPANY_PROFILE_UPDATED,
      summary,
      entityType: "company",
      entityId: member.companyId,
      metadata: { changes },
    });
  }

  return NextResponse.json({ company });
}
