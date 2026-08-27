import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  generatePortalToken,
  hashPortalToken,
  PORTAL_SESSION_COOKIE,
  PORTAL_SESSION_TTL_MS,
} from "@/lib/portal/tokens";

export type PortalSessionClient = {
  sessionId: string;
  clientId: string;
  companyId: string;
  clientName: string;
  clientEmail: string | null;
  companyName: string;
  companySlug: string;
};

export async function createPortalSession(clientId: string): Promise<string> {
  const rawToken = generatePortalToken();
  const tokenHash = hashPortalToken(rawToken);
  const expiresAt = new Date(Date.now() + PORTAL_SESSION_TTL_MS);

  await prisma.clientPortalSession.create({
    data: {
      clientId,
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(PORTAL_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(PORTAL_SESSION_TTL_MS / 1000),
  });

  return rawToken;
}

export async function destroyPortalSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  cookieStore.set(PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  if (!rawToken) return;
  const tokenHash = hashPortalToken(rawToken);
  await prisma.clientPortalSession.deleteMany({ where: { tokenHash } });
}

export async function getPortalSession(): Promise<PortalSessionClient | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(PORTAL_SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const tokenHash = hashPortalToken(rawToken);
  const session = await prisma.clientPortalSession.findUnique({
    where: { tokenHash },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          companyId: true,
          company: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await prisma.clientPortalSession.deleteMany({ where: { id: session.id } });
    }
    cookieStore.set(PORTAL_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return null;
  }

  // Touch lastSeenAt occasionally (not every request).
  const touchAfterMs = 15 * 60 * 1000;
  if (Date.now() - session.lastSeenAt.getTime() > touchAfterMs) {
    await prisma.clientPortalSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }

  return {
    sessionId: session.id,
    clientId: session.client.id,
    companyId: session.client.companyId,
    clientName: session.client.name,
    clientEmail: session.client.email,
    companyName: session.client.company.name,
    companySlug: session.client.company.slug,
  };
}

export async function requirePortalSession(): Promise<PortalSessionClient> {
  const session = await getPortalSession();
  if (!session) {
    throw new PortalAuthError("Sign in to open your client portal");
  }
  return session;
}

export class PortalAuthError extends Error {
  readonly status = 401;
  constructor(message: string) {
    super(message);
    this.name = "PortalAuthError";
  }
}
