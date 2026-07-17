import { cookies } from "next/headers";
import { fetchQrPdfBytes } from "@/lib/cloudinary";
import { qrUnlockCookieName, qrUnlockToken } from "@/lib/qr-codes/password";
import { getQrCodeByToken, recordQrScan } from "@/lib/qr-codes/service";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const qr = await getQrCodeByToken(token);

  if (!qr || qr.type !== "PDF" || qr.status === "DELETED") {
    return new Response("Not found", { status: 404 });
  }
  if (qr.status === "PAUSED") {
    return new Response("This QR code is paused", { status: 403 });
  }

  if (qr.passwordHash) {
    const cookieStore = await cookies();
    const unlocked =
      cookieStore.get(qrUnlockCookieName(qr.id))?.value ===
      qrUnlockToken(qr.id, qr.passwordHash);
    if (!unlocked) {
      return new Response("Password required", { status: 401 });
    }
  }

  const content = (qr.content ?? {}) as Record<string, unknown>;
  const fileUrl = typeof content.fileUrl === "string" ? content.fileUrl : null;
  const filePublicId =
    typeof content.filePublicId === "string" ? content.filePublicId : null;
  const deliveryType =
    content.deliveryType === "upload" || content.deliveryType === "authenticated"
      ? content.deliveryType
      : filePublicId
        ? "authenticated"
        : "upload";
  const fileName =
    typeof content.fileName === "string" && content.fileName.trim()
      ? content.fileName.trim()
      : "document.pdf";

  if (!fileUrl && !filePublicId) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { bytes, contentType } = await fetchQrPdfBytes({
      filePublicId,
      fileUrl,
      deliveryType,
    });

    await recordQrScan(qr.id);

    const safeName = fileName.replace(/[^\w.\- ()]+/g, "_");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("QR PDF proxy failed:", error);
    return new Response("Unable to load document", { status: 502 });
  }
}
