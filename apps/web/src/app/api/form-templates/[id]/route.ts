import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import {
  deleteFormTemplate,
  serializeFormTemplate,
  updateFormTemplate,
} from "@/lib/project-forms";
import { updateFormTemplateSchema } from "@/lib/schemas/project-form";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = updateFormTemplateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const template = await updateFormTemplate(member.companyId, id, parsed.data);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template: serializeFormTemplate(template) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const deleted = await deleteFormTemplate(member.companyId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
