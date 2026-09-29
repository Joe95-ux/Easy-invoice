import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { fetchExchangeRate } from "@/lib/exchange-rates";
import { FX_SOURCES } from "@/lib/schemas/fx-settings";

export async function GET(request: Request) {
  const { response } = await requireApiMember();
  if (response) return response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const date = url.searchParams.get("date");
  const preferRaw = url.searchParams.get("prefer");
  const prefer =
    preferRaw && (FX_SOURCES as readonly string[]).includes(preferRaw)
      ? (preferRaw as (typeof FX_SOURCES)[number])
      : "auto";

  const result = await fetchExchangeRate({ from, to, date, prefer });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
