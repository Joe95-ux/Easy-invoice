import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { ensureProjectFormShareLink, serializeProjectForm } from "@/lib/project-forms";

type RouteContext = { params: Promise<{ id: string; formId: string }> };

/** Ensure a public share link exists and mark the form as sent. */
export async function POST(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: projectId, formId } = await context.params;
  const owned = await prisma.projectForm.findFirst({
    where: { id: formId, projectId, project: { companyId: member.companyId } },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  try {
    const form = await ensureProjectFormShareLink(member.companyId, formId);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    return NextResponse.json({ form: serializeProjectForm(form) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create share link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
