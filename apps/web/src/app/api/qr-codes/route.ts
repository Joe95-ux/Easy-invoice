import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import { qrCodeSchema } from "@/lib/schemas/qr-code";
import { createQrCode, getQrCodesForCompany } from "@/lib/qr-codes/service";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const qrCodes = await getQrCodesForCompany(member.companyId);
  return NextResponse.json({ qrCodes });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = qrCodeSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const qrCode = await createQrCode({
    companyId: member.companyId,
    memberId: member.id,
    name: parsed.data.name,
    type: parsed.data.type,
    content: parsed.data.content,
    design: parsed.data.design,
    passwordEnabled: parsed.data.passwordEnabled,
    password: parsed.data.password,
  });

  return NextResponse.json({ qrCode }, { status: 201 });
}
