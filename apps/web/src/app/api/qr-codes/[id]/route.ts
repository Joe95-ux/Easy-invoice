import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import {
  accessPasswordMissing,
  qrCodeSchema,
} from "@/lib/schemas/qr-code";
import { isQrAccessPasswordStrong } from "@/lib/qr-codes/password";
import {
  deleteQrCode,
  getQrCodeForCompany,
  updateQrCode,
} from "@/lib/qr-codes/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const qrCode = await getQrCodeForCompany(id, member.companyId);
  if (!qrCode) {
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  }

  return NextResponse.json({ qrCode });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = qrCodeSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  if (parsed.data.passwordEnabled) {
    const password = parsed.data.password?.trim() ?? "";
    if (password && !isQrAccessPasswordStrong(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }
  }

  try {
    // Creating protection for the first time requires a password.
    if (parsed.data.passwordEnabled && accessPasswordMissing(parsed.data)) {
      const existing = await getQrCodeForCompany(id, member.companyId);
      if (!existing?.passwordProtected) {
        return NextResponse.json(
          { error: "Set a password of at least 8 characters to protect this QR code." },
          { status: 400 },
        );
      }
    }

    const qrCode = await updateQrCode(id, member.companyId, {
      name: parsed.data.name,
      content: parsed.data.content,
      design: parsed.data.design,
      passwordEnabled: parsed.data.passwordEnabled,
      password: parsed.data.password,
    });
    if (!qrCode) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }

    return NextResponse.json({ qrCode });
  } catch (error) {
    if (error instanceof Error && error.message === "PASSWORD_REQUIRED") {
      return NextResponse.json(
        { error: "Set a password of at least 8 characters to protect this QR code." },
        { status: 400 },
      );
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const deleted = await deleteQrCode(id, member.companyId);
  if (!deleted) {
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
