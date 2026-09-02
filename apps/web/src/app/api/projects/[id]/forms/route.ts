import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import {
  createProjectForm,
  listProjectForms,
  serializeProjectForm,
} from "@/lib/project-forms";
import { createProjectFormSchema } from "@/lib/schemas/project-form";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: projectId } = await context.params;
  const forms = await listProjectForms(member.companyId, projectId);
  return NextResponse.json({ forms: forms.map(serializeProjectForm) });
}

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: projectId } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = createProjectFormSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const form = await createProjectForm(member.companyId, projectId, parsed.data);
    return NextResponse.json({ form: serializeProjectForm(form) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create form";
    const status = message === "Project not found" || message === "Template not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
