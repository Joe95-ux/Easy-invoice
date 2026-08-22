import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { MIN_PLAN_BALANCE } from "@/lib/collections/advice";
import { buildInvoicePaymentSummary } from "@/lib/invoice-payments";
import { formatMoney, getInvoiceForMember } from "@/lib/invoices";
import { daysUntilDue, startOfUtcDay } from "@/lib/reminders/dates";
import {
  assertProFeature,
  isPlanLimitError,
  planLimitResponse,
} from "@/lib/billing/entitlements";

const draftSchema = z.object({
  clientName: z.string().trim().max(120).optional(),
  tone: z.enum(["professional", "friendly", "short", "collections"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

function fallbackDraft(input: {
  clientName?: string;
  companyName: string;
  invoiceNumber: string;
  total: string;
  balanceDue: string;
  dueDate?: string | null;
  daysPastDue: number | null;
  tone: "professional" | "friendly" | "short" | "collections";
  hasPaymentPlan: boolean;
  canOfferPlan: boolean;
}): string {
  const greeting = input.clientName ? `Hi ${input.clientName},` : "Hello,";
  const due = input.dueDate ? ` It is due on ${input.dueDate}.` : "";

  if (input.tone === "collections") {
    const overdue =
      input.daysPastDue != null && input.daysPastDue > 0
        ? ` This invoice is ${input.daysPastDue} day${input.daysPastDue === 1 ? "" : "s"} overdue.`
        : "";
    const planLine = input.hasPaymentPlan
      ? " A payment schedule is already set up — you can pay the next installment online using the link in this message."
      : input.canOfferPlan
        ? " If it is easier to pay in parts, reply to this email and we can set up a short payment plan. Otherwise you can pay online using the link in this message."
        : " You can pay online using the link in this message.";
    return `${greeting}\n\nI'm following up on invoice ${input.invoiceNumber}. The remaining balance is ${input.balanceDue}.${overdue}${planLine}\n\nThank you,\n${input.companyName}`;
  }

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
  if (tone === "collections") {
    try {
      assertProFeature(member.company.plan, "collections");
    } catch (error) {
      if (isPlanLimitError(error)) return planLimitResponse(error);
      throw error;
    }
  }
  const clientName =
    parsed.data.clientName?.trim() || invoice.client?.name?.trim() || undefined;
  const summary = buildInvoicePaymentSummary(invoice);
  const total = formatMoney(invoice.total, invoice.currency);
  const balanceDue = formatMoney(summary.balanceDue, invoice.currency);
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const today = startOfUtcDay(new Date());
  const until = invoice.dueDate ? daysUntilDue(today, invoice.dueDate) : null;
  const daysPastDue = until != null && until < 0 ? Math.abs(until) : null;
  const hasPaymentPlan = summary.installments.length > 0;
  const canOfferPlan =
    !hasPaymentPlan &&
    summary.amountPaid <= 0.001 &&
    summary.balanceDue >= MIN_PLAN_BALANCE;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      message: fallbackDraft({
        clientName,
        companyName: invoice.company.name,
        invoiceNumber: invoice.number,
        total,
        balanceDue,
        dueDate,
        daysPastDue,
        tone,
        hasPaymentPlan,
        canOfferPlan,
      }),
      source: "template",
    });
  }

  try {
    const isCollections = tone === "collections";
    const collectionsPlanGuidance = hasPaymentPlan
      ? "A payment schedule already exists. Mention they can pay the next installment online. Do not offer to create a new plan."
      : canOfferPlan
        ? "Offer that they can reply to arrange a short payment plan if paying in full is hard."
        : "Do not offer a payment plan. Ask them to pay the remaining balance online.";
    const prompt = [
      isCollections
        ? "Write a short payment follow-up email for an unpaid or partially paid invoice."
        : "Write a short professional email note to accompany an invoice PDF attachment.",
      "Plain text only. No subject line. No markdown. 2-5 sentences.",
      "Do not invent payment links or bank details.",
      isCollections
        ? `Tone: firm but respectful. Mention remaining balance. ${collectionsPlanGuidance} Do not threaten or shame.`
        : `Tone: ${tone}.`,
      `Company: ${invoice.company.name}`,
      `Invoice: ${invoice.number}`,
      `Invoice total: ${total}`,
      `Balance due: ${balanceDue}`,
      dueDate ? `Due date: ${dueDate}` : "Due date: not set",
      daysPastDue != null ? `Days overdue: ${daysPastDue}` : "Not overdue (or no due date)",
      hasPaymentPlan
        ? `Payment plan: yes (${summary.installments.length} installments)`
        : "Payment plan: none",
      invoice.viewedAt ? "Client has opened the invoice link." : "Client may not have opened the invoice yet.",
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
        temperature: isCollections ? 0.45 : 0.6,
        max_tokens: 280,
        messages: [
          {
            role: "system",
            content: isCollections
              ? "You draft concise payment follow-ups for small businesses. Stay clear, human, and respectful. Never invent URLs or bank details."
              : "You draft concise invoice email notes for small businesses. Stay warm, clear, and professional.",
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
        balanceDue,
        dueDate,
        daysPastDue,
        tone,
        hasPaymentPlan,
        canOfferPlan,
      }),
      source: "template",
    });
  }
}
