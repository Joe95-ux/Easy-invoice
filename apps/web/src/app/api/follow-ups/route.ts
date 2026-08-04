import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import {
  createFollowUp,
  getFollowUpsForCompany,
  serializeFollowUp,
} from "@/lib/follow-ups/service";
import { followUpSchema } from "@/lib/schemas/follow-up";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const items = await getFollowUpsForCompany(member.companyId);
  return NextResponse.json({ followUps: items.map(serializeFollowUp) });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = followUpSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const followUp = await createFollowUp(member.companyId, member.id, parsed.data);
    return NextResponse.json({ followUp: serializeFollowUp(followUp) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create follow-up";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
