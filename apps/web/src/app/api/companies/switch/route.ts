import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { switchActiveCompany } from "@/lib/auth";
import { toCompanySummary } from "@/lib/companies";

const switchCompanySchema = z.object({
  companyId: z.string().min(1),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = switchCompanySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const member = await switchActiveCompany(userId, parsed.data.companyId);
  if (!member) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({
    company: toCompanySummary(member.company),
  });
}
