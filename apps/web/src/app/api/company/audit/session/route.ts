import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { recordMemberSignIn } from "@/lib/audit/service";

const bodySchema = z.object({
  sessionId: z.string().min(1).max(200),
});

/** Record the current member's sign-in once per Clerk session. */
export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const event = await recordMemberSignIn({
    companyId: member.companyId,
    memberId: member.id,
    sessionId: parsed.data.sessionId,
  });

  return NextResponse.json({ recorded: Boolean(event), id: event?.id ?? null });
}
