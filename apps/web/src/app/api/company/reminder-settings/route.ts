import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiCompanyAdmin,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import { recordAuditEvent } from "@/lib/audit/service";
import { summarizeReminderSettingsChange } from "@/lib/audit/summaries";
import { AuditAction, AuditCategory, prisma } from "@/lib/db";
import { reminderSettingsFromCompany } from "@/lib/reminders/settings";
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
      paymentReceiptEmailsEnabled: true,
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

  const before = await prisma.company.findUnique({
    where: { id: authResult.member.companyId },
    select: {
      remindersEnabled: true,
      reminderDaysBefore: true,
      reminderOnDueDate: true,
      reminderDaysAfter: true,
      reminderIncludePdf: true,
      paymentReceiptEmailsEnabled: true,
    },
  });
  if (!before) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const company = await prisma.company.update({
    where: { id: authResult.member.companyId },
    data: parsed.data,
    select: {
      remindersEnabled: true,
      reminderDaysBefore: true,
      reminderOnDueDate: true,
      reminderDaysAfter: true,
      reminderIncludePdf: true,
      paymentReceiptEmailsEnabled: true,
    },
  });

  const beforeSettings = reminderSettingsFromCompany(before);
  const afterSettings = reminderSettingsFromCompany(company);
  const { summary, changes } = summarizeReminderSettingsChange(
    beforeSettings as Record<string, unknown>,
    afterSettings as Record<string, unknown>,
  );

  if (changes.length > 0) {
    await recordAuditEvent({
      companyId: authResult.member.companyId,
      memberId: authResult.member.id,
      category: AuditCategory.SETTINGS,
      action: AuditAction.REMINDER_SETTINGS_UPDATED,
      summary,
      entityType: "company",
      entityId: authResult.member.companyId,
      metadata: { changes },
    });
  }

  return NextResponse.json({ settings: afterSettings });
}
