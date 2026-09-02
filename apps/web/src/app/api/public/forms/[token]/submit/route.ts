import { NextResponse } from "next/server";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { submitProjectFormByToken } from "@/lib/project-forms";
import { submitProjectFormSchema } from "@/lib/schemas/project-form";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = submitProjectFormSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const submission = await submitProjectFormByToken(token, parsed.data);
    return NextResponse.json({ ok: true, submissionId: submission.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit form";
    const status = message === "Form not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
