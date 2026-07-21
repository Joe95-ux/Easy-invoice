import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { formatMoney, getInvoiceForMember } from "@/lib/invoices";

const draftSchema = z.object({
  clientName: z.string().trim().max(120).optional(),
  tone: z.enum(["professional", "friendly", "short"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

function fallbackDraft(input: {
  clientName?: string;
  companyName: string;
  invoiceNumber: string;
  total: string;
  dueDate?: string | null;
  tone: "professional" | "friendly" | "short";
}): string {
  const greeting = input.clientName ? `Hi ${input.clientName},` : "Hello,";
  const due = input.dueDate ? ` It is due on ${input.dueDate}.` : "";

  if (input.tone === "short") {
    return `${greeting}\n\nPlease find invoice ${input.invoiceNumber} attached (${input.total}).${due}\n\nThank you,\n${input.companyName}`;
  }

  if (input.tone === "friendly") {
    return `${greeting}\n\nHope you're doing well! I've attached invoice ${input.invoiceNumber} for ${input.total}.${due}\n\nPlease let me know if you have any questions — happy to help.\n\nBest regards,\n${input.companyName}`;
  }

  return `${greeting}\n\nPlease find attached invoice ${input.invoiceNumber} from ${input.companyName}.\n\nTotal due: ${input.total}.${due}\n\nThank you for your business.\n\nKind regards,\n${input.companyName}`;
}

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = draftSchema.safeParse(body ?? {});
  if (!parsed.success) return validationError(parsed.error);

  const invoice = await getInvoiceForMember(id, member.companyId);
  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tone = parsed.data.tone ?? "professional";
  const clientName =
    parsed.data.clientName?.trim() || invoice.client?.name?.trim() || undefined;
  const total = formatMoney(invoice.total, invoice.currency);
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString(undefined, {
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
        companyName: invoice.company.name,
        invoiceNumber: invoice.number,
        total,
        dueDate,
        tone,
      }),
      source: "template",
    });
  }

  try {
    const prompt = [
      "Write a short professional email note to accompany an invoice PDF attachment.",
      "Plain text only. No subject line. No markdown. 2-5 sentences.",
      "Do not invent payment links or bank details.",
      `Tone: ${tone}.`,
      `Company: ${invoice.company.name}`,
      `Invoice: ${invoice.number}`,
      `Total: ${total}`,
      dueDate ? `Due date: ${dueDate}` : "Due date: not set",
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
              "You draft concise invoice email notes for small businesses. Stay warm, clear, and professional.",
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
        companyName: invoice.company.name,
        invoiceNumber: invoice.number,
        total,
        dueDate,
        tone,
      }),
      source: "template",
    });
  }
}
