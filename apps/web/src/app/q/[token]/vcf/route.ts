import { cookies } from "next/headers";
import { buildVcard } from "@/lib/qr-codes/content";
import { qrUnlockCookieName, qrUnlockToken } from "@/lib/qr-codes/password";
import { getQrCodeByToken } from "@/lib/qr-codes/service";
import type { VcardContent } from "@/lib/qr-codes/types";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const qr = await getQrCodeByToken(token);
  if (!qr || qr.type !== "VCARD" || qr.status !== "ACTIVE") {
    return new Response("Not found", { status: 404 });
  }

  if (qr.passwordHash) {
    const cookieStore = await cookies();
    if (
      cookieStore.get(qrUnlockCookieName(qr.id))?.value !==
      qrUnlockToken(qr.id, qr.passwordHash)
    ) {
      return new Response("Not found", { status: 404 });
    }
  }

  const content = (qr.content ?? {}) as unknown as VcardContent;
  const vcard = buildVcard(content);
  const fileName = (
    content.contactName ||
    content.companyName ||
    content.organization ||
    content.fullName ||
    "contact"
  )
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();

  return new Response(vcard, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}.vcf"`,
    },
  });
}
