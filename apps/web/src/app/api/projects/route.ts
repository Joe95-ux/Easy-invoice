import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import {
  createProject,
  getProjectsForCompany,
  serializeProjectListItem,
  serializeProjectDetail,
} from "@/lib/projects";
import { createProjectSchema } from "@/lib/schemas/project";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const projects = await getProjectsForCompany(member.companyId);
  return NextResponse.json({
    projects: projects.map(serializeProjectListItem),
  });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const project = await createProject(member.companyId, parsed.data);
    if (!project) {
      return NextResponse.json({ error: "Could not create project" }, { status: 500 });
    }
    return NextResponse.json(
      { project: serializeProjectDetail(project) },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create project";
    const status = message === "Client not found" || message === "Not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
