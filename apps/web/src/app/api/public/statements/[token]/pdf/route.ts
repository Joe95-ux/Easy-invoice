import { NextResponse } from "next/server";
import { sanitizePdfFilename } from "@/lib/pdf-filename";
import { getStatementByToken, renderStatementPdfForRecord } from "@/lib/statements";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const statement = await getStatementByToken(token);
  if (!statement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdf = await renderStatementPdfForRecord(statement);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sanitizePdfFilename(statement.number)}.pdf"`,
    },
  });
}
