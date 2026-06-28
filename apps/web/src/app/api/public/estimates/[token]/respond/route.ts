import { NextResponse } from "next/server";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { respondToPublicEstimate } from "@/lib/public-documents";
import { z } from "zod";

const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await respondToPublicEstimate(token, parsed.data.action);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (result.error === "already_responded") {
    return NextResponse.json(
      { error: "This estimate has already been responded to", estimate: result.estimate },
      { status: 409 },
    );
  }

  return NextResponse.json({ estimate: result.estimate });
}
