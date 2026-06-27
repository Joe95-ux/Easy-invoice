import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { normalizeNominatimResult } from "@/lib/geo/address";

export async function GET(request: Request) {
  const { response } = await requireApiMember();
  if (response) return response;

  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 3) {
    return NextResponse.json([]);
  }

  const country = new URL(request.url).searchParams.get("country")?.trim();

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      limit: "6",
    });
    if (country) params.set("countrycodes", country.toLowerCase());

    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "EasyInvoice/1.0 (https://easy-invoice.app)",
          Accept: "application/json",
        },
        next: { revalidate: 3600 },
      },
    );

    if (!nominatimResponse.ok) {
      return NextResponse.json({ error: "Address search unavailable" }, { status: 502 });
    }

    const results = (await nominatimResponse.json()) as Parameters<
      typeof normalizeNominatimResult
    >[0][];

    return NextResponse.json(results.map(normalizeNominatimResult));
  } catch {
    return NextResponse.json({ error: "Address search failed" }, { status: 502 });
  }
}
