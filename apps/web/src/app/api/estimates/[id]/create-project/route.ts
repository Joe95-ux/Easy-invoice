import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import {
  maybeCreateProjectFromAcceptedEstimate,
  serializeProjectDetail,
} from "@/lib/projects";
import { getEstimateForMember } from "@/lib/estimates";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const createFromEstimateSchema = z.object({
  force: z.boolean().optional(),
});

/** Create (or return existing) project linked to this estimate. */
export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: estimateId } = await context.params;
  const estimate = await getEstimateForMember(estimateId, member.companyId);
  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = createFromEstimateSchema.safeParse(body ?? {});
  if (!parsed.success) return validationError(parsed.error);

  const project = await maybeCreateProjectFromAcceptedEstimate(
    member.companyId,
    estimateId,
    { force: true },
  );

  if (!project) {
    return NextResponse.json({ error: "Could not create project" }, { status: 500 });
  }

  return NextResponse.json({ project: serializeProjectDetail(project) }, { status: 201 });
}
