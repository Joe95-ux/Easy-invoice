import { NextResponse } from "next/server";
import { z } from "zod";
import { switchPortalAccount } from "@/lib/portal/auth";
import { getPortalSession, PortalAuthError } from "@/lib/portal/session";

const bodySchema = z.object({
  clientId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid company" }, { status: 400 });
    }

    const result = await switchPortalAccount({
      session,
      targetClientId: parsed.data.clientId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, redirectTo: "/portal" });
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[portal switch]", error);
    return NextResponse.json({ error: "Could not switch company" }, { status: 500 });
  }
}
