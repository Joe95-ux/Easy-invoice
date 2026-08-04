import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import {
  deleteFollowUp,
  serializeFollowUp,
  updateFollowUp,
} from "@/lib/follow-ups/service";
import { updateFollowUpSchema } from "@/lib/schemas/follow-up";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = updateFollowUpSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const followUp = await updateFollowUp(member.companyId, id, parsed.data);
    if (!followUp) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ followUp: serializeFollowUp(followUp) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update follow-up";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const deleted = await deleteFollowUp(member.companyId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
