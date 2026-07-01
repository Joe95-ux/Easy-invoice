import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiCompanyAdmin,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import { reminderSettingsFromCompany } from "@/lib/reminders/settings";
import { prisma } from "@/lib/db";
import { reminderSettingsSchema } from "@/lib/schemas/reminders";

export async function GET() {
  const authResult = await requireApiMember();
  if (authResult.response) return authResult.response;

  const company = await prisma.company.findUnique({
    where: { id: authResult.member.companyId },
    select: {
      remindersEnabled: true,
      reminderDaysBefore: true,
      reminderOnDueDate: true,
      reminderDaysAfter: true,
      reminderIncludePdf: true,
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ settings: reminderSettingsFromCompany(company) });
}

export async function PATCH(request: Request) {
  const authResult = await requireApiCompanyAdmin();
  if (authResult.response) return authResult.response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = reminderSettingsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const company = await prisma.company.update({
    where: { id: authResult.member.companyId },
    data: parsed.data,
    select: {
      remindersEnabled: true,
      reminderDaysBefore: true,
      reminderOnDueDate: true,
      reminderDaysAfter: true,
      reminderIncludePdf: true,
    },
  });

  return NextResponse.json({ settings: reminderSettingsFromCompany(company) });
}
