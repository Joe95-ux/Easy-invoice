import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import { isProPlan } from "@/lib/billing/entitlements";
import { sendContactEmail } from "@/lib/email";
import { CONTACT_TOPICS, contactSchema } from "@/lib/schemas/contact";

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const topicLabel =
    CONTACT_TOPICS.find((topic) => topic.value === parsed.data.topic)?.label ??
    parsed.data.topic;

  try {
    const priority = isProPlan(member.company.plan);
    await sendContactEmail({
      fromEmail: member.email,
      companyName: member.company.name,
      subject: parsed.data.subject,
      topic: topicLabel,
      message: parsed.data.message,
      priority,
      plan: member.company.plan,
    });
    return NextResponse.json({ ok: true, priority });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
