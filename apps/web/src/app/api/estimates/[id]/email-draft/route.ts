import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { formatMoney, getEstimateForMember } from "@/lib/estimates";

const draftSchema = z.object({
  clientName: z.string().trim().max(120).optional(),
  tone: z.enum(["professional", "friendly", "short"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

function fallbackDraft(input: {
  clientName?: string;
  companyName: string;
  estimateNumber: string;
  total: string;
  validUntil?: string | null;
  tone: "professional" | "friendly" | "short";
}): string {
  const greeting = input.clientName ? `Hi ${input.clientName},` : "Hello,";
  const valid = input.validUntil ? ` It is valid until ${input.validUntil}.` : "";

  if (input.tone === "short") {
    return `${greeting}\n\nPlease find estimate ${input.estimateNumber} attached (${input.total}).${valid}\n\nThank you,\n${input.companyName}`;
  }

  if (input.tone === "friendly") {
    return `${greeting}\n\nHope you're doing well! I've attached estimate ${input.estimateNumber} for ${input.total}.${valid}\n\nHappy to walk through any questions.\n\nBest regards,\n${input.companyName}`;
  }

  return `${greeting}\n\nPlease find attached estimate ${input.estimateNumber} from ${input.companyName}.\n\nTotal estimate: ${input.total}.${valid}\n\nWe look forward to working with you.\n\nKind regards,\n${input.companyName}`;
}

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = draftSchema.safeParse(body ?? {});
  if (!parsed.success) return validationError(parsed.error);

  const estimate = await getEstimateForMember(id, member.companyId);
  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tone = parsed.data.tone ?? "professional";
  const clientName =
    parsed.data.clientName?.trim() || estimate.client?.name?.trim() || undefined;
  const total = formatMoney(estimate.total, estimate.currency);
  const validUntil = estimate.validUntil
    ? new Date(estimate.validUntil).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      message: fallbackDraft({
        clientName,
        companyName: estimate.company.name,
        estimateNumber: estimate.number,
        total,
        validUntil,
        tone,
      }),
      source: "template",
    });
  }

  try {
    const prompt = [
      "Write a short professional email note to accompany an estimate PDF attachment.",
      "Plain text only. No subject line. No markdown. 2-5 sentences.",
      "Do not invent payment links or bank details.",
      `Tone: ${tone}.`,
      `Company: ${estimate.company.name}`,
      `Estimate: ${estimate.number}`,
      `Total: ${total}`,
      validUntil ? `Valid until: ${validUntil}` : "Valid until: not set",
      clientName ? `Client name: ${clientName}` : "Client name: unknown",
    ].join("\n");

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.6,
        max_tokens: 280,
        messages: [
          {
            role: "system",
            content:
              "You draft concise estimate email notes for small businesses. Stay warm, clear, and professional.",
          },
          { role: "user", content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => "");
      throw new Error(errText || `OpenAI error ${aiResponse.status}`);
    }

    const payload = (await aiResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const message = payload.choices?.[0]?.message?.content?.trim();
    if (!message) throw new Error("Empty AI response");

    return NextResponse.json({ message, source: "ai" });
  } catch {
    return NextResponse.json({
      message: fallbackDraft({
        clientName,
        companyName: estimate.company.name,
        estimateNumber: estimate.number,
        total,
        validUntil,
        tone,
      }),
      source: "template",
    });
  }
}
