import { NextResponse } from "next/server";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { respondToPublicEstimate } from "@/lib/public-documents";
import { z } from "zod";

const DATA_URL_MAX = 400_000;

const respondSchema = z
  .object({
    action: z.enum(["accept", "decline"]),
    signerName: z.string().trim().min(2).max(120).optional(),
    signatureDataUrl: z
      .string()
      .trim()
      .max(DATA_URL_MAX)
      .regex(/^data:image\/png;base64,/, "Signature must be a PNG data URL")
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === "accept" && !value.signerName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Full name is required to accept",
        path: ["signerName"],
      });
    }
  });

type RouteContext = { params: Promise<{ token: string }> };

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 100);
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp ? realIp.slice(0, 100) : null;
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await respondToPublicEstimate(token, parsed.data.action, {
    signerName: parsed.data.signerName,
    signatureDataUrl: parsed.data.signatureDataUrl,
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  });
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
