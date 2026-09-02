import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiCompanyAdmin, parseJsonBody, validationError } from "@/lib/api/validation";
import { prisma } from "@/lib/db";

const projectSettingsSchema = z.object({
  createProjectOnEstimateAccept: z.boolean(),
});

export async function GET() {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  const company = await prisma.company.findUnique({
    where: { id: member.companyId },
    select: { createProjectOnEstimateAccept: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ settings: company });
}

export async function PATCH(request: Request) {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = projectSettingsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const company = await prisma.company.update({
    where: { id: member.companyId },
    data: {
      createProjectOnEstimateAccept: parsed.data.createProjectOnEstimateAccept,
    },
    select: { createProjectOnEstimateAccept: true },
  });

  return NextResponse.json({ settings: company });
}
