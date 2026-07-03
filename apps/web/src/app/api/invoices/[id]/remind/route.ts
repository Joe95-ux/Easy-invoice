import { NextResponse } from "next/server";
import { z } from "zod";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import { ReminderKind } from "@/lib/db";
import { startOfUtcDay } from "@/lib/reminders/dates";
import { sendInvoiceReminder } from "@/lib/reminders/service";

const remindSchema = z.object({
  email: z.string().email().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = remindSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await sendInvoiceReminder({
    invoiceId: id,
    companyId: member.companyId,
    kind: ReminderKind.MANUAL,
    offsetDays: -1,
    scheduleDate: startOfUtcDay(new Date()),
    recipientEmail: parsed.data.email,
    memberId: member.id,
  });

  if (result.ok) {
    return NextResponse.json({ ok: true, reminderId: result.reminderId });
  }

  if (result.skipped) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ error: result.error }, { status: 400 });
}
