import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import {
  reorderFollowUps,
  serializeFollowUp,
} from "@/lib/follow-ups/service";
import { reorderFollowUpsSchema } from "@/lib/schemas/follow-up";

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = reorderFollowUpsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const items = await reorderFollowUps(member.companyId, parsed.data.orderedIds);
  return NextResponse.json({ followUps: items.map(serializeFollowUp) });
}
