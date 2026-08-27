import { NextResponse } from "next/server";
import { getPortalSession, PortalAuthError } from "@/lib/portal/session";

export async function GET() {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      authenticated: true,
      client: {
        id: session.clientId,
        name: session.clientName,
        email: session.clientEmail,
      },
      company: {
        id: session.companyId,
        name: session.companyName,
        slug: session.companySlug,
      },
    });
  } catch (error) {
    if (error instanceof PortalAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
