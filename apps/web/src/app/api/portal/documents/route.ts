import { NextResponse } from "next/server";
import { getPortalDashboard } from "@/lib/portal/queries";
import { getPortalSession, PortalAuthError } from "@/lib/portal/session";

export async function GET() {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const dashboard = await getPortalDashboard({
      clientId: session.clientId,
      companyId: session.companyId,
    });

    return NextResponse.json({
      client: {
        name: session.clientName,
        email: session.clientEmail,
      },
      company: {
        name: session.companyName,
      },
      ...dashboard,
    });
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[portal documents]", error);
    return NextResponse.json({ error: "Could not load portal" }, { status: 500 });
  }
}
