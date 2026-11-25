import { NextResponse } from "next/server";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { optOutClientMarketing } from "@/lib/retention/service";
import { parseRetentionUnsubscribeToken } from "@/lib/retention/unsubscribe";
import { z } from "zod";

const bodySchema = z.object({
  token: z.string().min(1),
});

async function readUnsubscribeToken(request: Request): Promise<string | NextResponse> {
  const fromQuery = new URL(request.url).searchParams.get("token")?.trim();
  if (fromQuery) return fromQuery;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const fromForm = form.get("token");
    if (typeof fromForm === "string" && fromForm.trim()) return fromForm.trim();
    return NextResponse.json({ error: "Invalid or expired unsubscribe link" }, { status: 400 });
  }

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  return parsed.data.token;
}

export async function POST(request: Request) {
  const token = await readUnsubscribeToken(request);
  if (token instanceof NextResponse) return token;

  const claims = parseRetentionUnsubscribeToken(token);
  if (!claims) {
    return NextResponse.json({ error: "Invalid or expired unsubscribe link" }, { status: 400 });
  }

  const result = await optOutClientMarketing(claims.clientId, claims.companyId);
  if (!result) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    alreadyOptedOut: result.alreadyOptedOut,
    name: result.client.name,
  });
}
