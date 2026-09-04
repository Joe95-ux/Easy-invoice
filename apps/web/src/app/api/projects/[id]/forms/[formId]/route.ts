import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import {
  deleteProjectForm,
  getProjectFormForCompany,
  serializeProjectForm,
  serializeProjectFormDetail,
  updateProjectForm,
} from "@/lib/project-forms";
import { updateProjectFormSchema } from "@/lib/schemas/project-form";

type RouteContext = { params: Promise<{ id: string; formId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: projectId, formId } = await context.params;
  const form = await getProjectFormForCompany(member.companyId, projectId, formId);
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  return NextResponse.json({ form: serializeProjectFormDetail(form) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: projectId, formId } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = updateProjectFormSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const form = await updateProjectForm(member.companyId, projectId, formId, parsed.data);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    return NextResponse.json({ form: serializeProjectForm(form) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update form";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: projectId, formId } = await context.params;
  const deleted = await deleteProjectForm(member.companyId, projectId, formId);
  if (!deleted) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
