import { buildIcs } from "@/lib/qr-codes/content";
import { getQrCodeByToken } from "@/lib/qr-codes/service";
import type { EventContent } from "@/lib/qr-codes/types";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const qr = await getQrCodeByToken(token);
  if (!qr || qr.type !== "EVENT") {
    return new Response("Not found", { status: 404 });
  }

  const content = (qr.content ?? {}) as unknown as EventContent;
  const ics = buildIcs(content, qr.token);
  const fileName = (content.title || "event").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}.ics"`,
    },
  });
}
