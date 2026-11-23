import { NextResponse } from "next/server";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { optOutClientMarketing } from "@/lib/retention/service";
import { parseRetentionUnsubscribeToken } from "@/lib/retention/unsubscribe";
import { z } from "zod";

const bodySchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const claims = parseRetentionUnsubscribeToken(parsed.data.token);
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
