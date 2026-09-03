import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { getProjectFormForCompany, serializeProjectFormDetail } from "@/lib/project-forms";

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
