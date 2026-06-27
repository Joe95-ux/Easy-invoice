import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { parseInvoiceFromText } from "@/lib/ai-docs";
import { parseInvoiceRequestSchema } from "@/lib/schemas/invoice";

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = parseInvoiceRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const draft = await parseInvoiceFromText(parsed.data.text, {
      localeHint: parsed.data.localeHint ?? member.company.locale,
      companyName: member.company.name,
      companyCurrency: member.company.currency,
      outputLanguage: "en",
      referenceDate: new Date().toISOString().slice(0, 10),
    });
    return NextResponse.json(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parse failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
