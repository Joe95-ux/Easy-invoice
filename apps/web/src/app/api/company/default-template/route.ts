import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { setCompanyDefaultTemplate } from "@/lib/templates";

const bodySchema = z.object({
  templateId: z.string().min(1),
});

export async function PATCH(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    await setCompanyDefaultTemplate(member.companyId, parsed.data.templateId);
    return NextResponse.json({ defaultTemplateId: parsed.data.templateId });
  } catch {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
}
