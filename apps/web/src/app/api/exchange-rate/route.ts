import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { fetchExchangeRate } from "@/lib/exchange-rates";

export async function GET(request: Request) {
  const { response } = await requireApiMember();
  if (response) return response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const result = await fetchExchangeRate({ from, to });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
