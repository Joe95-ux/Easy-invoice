import { NextResponse } from "next/server";
import { requireApiMember, requireApiCompanyAdmin, parseJsonBody, validationError } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { companySettingsSchema } from "@/lib/schemas/company";

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
    },
  });

  return NextResponse.json({ company });
}
