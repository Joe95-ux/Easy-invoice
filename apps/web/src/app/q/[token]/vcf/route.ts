import { buildVcard } from "@/lib/qr-codes/content";
import { getQrCodeByToken } from "@/lib/qr-codes/service";
import type { VcardContent } from "@/lib/qr-codes/types";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const qr = await getQrCodeByToken(token);
  if (!qr || qr.type !== "VCARD") {
    return new Response("Not found", { status: 404 });
  }

  const content = (qr.content ?? {}) as unknown as VcardContent;
  const vcard = buildVcard(content);
  const fileName = (content.fullName || "contact").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new Response(vcard, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}.vcf"`,
    },
  });
}
