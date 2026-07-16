import { NextResponse } from "next/server";
import { z } from "zod";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import { updateQrCodeStatus } from "@/lib/qr-codes/service";

type RouteContext = { params: Promise<{ id: string }> };

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "DELETED"]),
});

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const qrCode = await updateQrCodeStatus(id, member.companyId, parsed.data.status);
  if (!qrCode) {
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  }

  return NextResponse.json({ qrCode });
}
