import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import {
  createFormTemplate,
  listFormTemplates,
  serializeFormTemplate,
} from "@/lib/project-forms";
import { createFormTemplateSchema } from "@/lib/schemas/project-form";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const templates = await listFormTemplates(member.companyId);
  return NextResponse.json({ templates: templates.map(serializeFormTemplate) });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = createFormTemplateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const template = await createFormTemplate(member.companyId, parsed.data);
  return NextResponse.json({ template: serializeFormTemplate(template) }, { status: 201 });
}
