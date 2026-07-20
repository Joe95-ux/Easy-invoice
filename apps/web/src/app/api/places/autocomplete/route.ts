import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";

type GooglePrediction = {
  description?: string;
  place_id?: string;
};

type GoogleDetailsResult = {
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  name?: string;
};

export async function GET(request: Request) {
  const { response } = await requireApiMember();
  if (response) return response;

  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        error: "Google Places is not configured",
        configured: false,
        predictions: [],
      },
      { status: 200 },
    );
  }

  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim() ?? "";
  const placeId = searchParams.get("placeId")?.trim() ?? "";

  try {
    if (placeId) {
      const detailsUrl = new URL(
        "https://maps.googleapis.com/maps/api/place/details/json",
      );
      detailsUrl.searchParams.set("place_id", placeId);
      detailsUrl.searchParams.set("fields", "formatted_address,geometry,name");
      detailsUrl.searchParams.set("key", key);
      const detailsRes = await fetch(detailsUrl.toString());
      const detailsData = (await detailsRes.json()) as {
        status?: string;
        result?: GoogleDetailsResult;
        error_message?: string;
      };
      if (detailsData.status !== "OK" || !detailsData.result) {
        return NextResponse.json(
          { error: detailsData.error_message ?? "Place lookup failed" },
          { status: 400 },
        );
      }
      return NextResponse.json({
        configured: true,
        place: {
          address: detailsData.result.formatted_address ?? detailsData.result.name ?? "",
          lat: detailsData.result.geometry?.location?.lat ?? null,
          lng: detailsData.result.geometry?.location?.lng ?? null,
        },
      });
    }

    if (input.length < 2) {
      return NextResponse.json({ configured: true, predictions: [] });
    }

    const autoUrl = new URL(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json",
    );
    autoUrl.searchParams.set("input", input);
    autoUrl.searchParams.set("key", key);
    const autoRes = await fetch(autoUrl.toString());
    const autoData = (await autoRes.json()) as {
      status?: string;
      predictions?: GooglePrediction[];
      error_message?: string;
    };

    if (autoData.status && !["OK", "ZERO_RESULTS"].includes(autoData.status)) {
      return NextResponse.json(
        { error: autoData.error_message ?? "Places search failed", configured: true },
        { status: 400 },
      );
    }

    return NextResponse.json({
      configured: true,
      predictions: (autoData.predictions ?? [])
        .filter((item) => item.place_id && item.description)
        .slice(0, 6)
        .map((item) => ({
          placeId: item.place_id as string,
          description: item.description as string,
        })),
    });
  } catch (error) {
    console.error("Places autocomplete failed:", error);
    return NextResponse.json({ error: "Places search failed" }, { status: 500 });
  }
}
