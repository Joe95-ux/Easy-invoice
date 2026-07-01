import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import { sendFeedbackEmail } from "@/lib/email";
import { feedbackSchema } from "@/lib/schemas/feedback";

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await sendFeedbackEmail({
      fromEmail: member.email,
      companyName: member.company.name,
      message: parsed.data.message,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send feedback";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
