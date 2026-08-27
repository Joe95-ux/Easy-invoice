import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPortalMagicLinks } from "@/lib/portal/auth";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter a valid email" },
      { status: 400 },
    );
  }

  try {
    const result = await requestPortalMagicLinks(parsed.data.email);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[portal auth request]", error);
    return NextResponse.json(
      { error: "Could not send sign-in link. Try again shortly." },
      { status: 502 },
    );
  }
}
