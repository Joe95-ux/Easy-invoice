import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseInvoiceFromText } from "@/lib/ai-docs";
import { getCurrentMember } from "@/lib/auth";

const parseRequestSchema = z.object({
  text: z.string().min(10),
  localeHint: z.string().optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = parseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const draft = await parseInvoiceFromText(
      parsed.data.text,
      parsed.data.localeHint ?? member.company.locale,
    );
    return NextResponse.json(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parse failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
