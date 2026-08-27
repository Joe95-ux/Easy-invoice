import "server-only";

import { prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";
import { isEmailConfigured, sendClientPortalMagicLinkEmail } from "@/lib/email";
import {
  generatePortalToken,
  hashPortalToken,
  normalizePortalEmail,
  PORTAL_MAGIC_LINK_TTL_MS,
} from "@/lib/portal/tokens";

export type PortalMagicLinkRequestResult = {
  /** Always true to callers — never reveal whether the email matched. */
  ok: true;
  /** Dev-only: callback URLs when email is not configured. */
  debugLinks?: Array<{ companyName: string; url: string }>;
};

/**
 * Find client records for an email and email one-time portal links.
 * Always returns ok so attackers cannot probe for emails.
 */
export async function requestPortalMagicLinks(
  emailInput: string,
): Promise<PortalMagicLinkRequestResult> {
  const email = normalizePortalEmail(emailInput);
  if (!email || !email.includes("@")) {
    return { ok: true };
  }

  const clients = await prisma.client.findMany({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
    select: {
      id: true,
      email: true,
      company: { select: { name: true } },
    },
    take: 20,
  });

  if (clients.length === 0) {
    return { ok: true };
  }

  const origin = await getAppOrigin();
  const expiresAt = new Date(Date.now() + PORTAL_MAGIC_LINK_TTL_MS);
  const links: Array<{ companyName: string; url: string }> = [];

  for (const client of clients) {
    const rawToken = generatePortalToken();
    await prisma.clientPortalMagicLink.create({
      data: {
        clientId: client.id,
        email: client.email ? normalizePortalEmail(client.email) : email,
        tokenHash: hashPortalToken(rawToken),
        expiresAt,
      },
    });
    links.push({
      companyName: client.company.name,
      url: `${origin}/portal/auth/callback?token=${encodeURIComponent(rawToken)}`,
    });
  }

  if (isEmailConfigured()) {
    await sendClientPortalMagicLinkEmail({ to: email, links });
    return { ok: true };
  }

  // Local/dev without Resend: return links so the UI can show them.
  if (process.env.NODE_ENV !== "production") {
    return { ok: true, debugLinks: links };
  }

  return { ok: true };
}

export async function consumePortalMagicLink(rawToken: string): Promise<{
  clientId: string;
} | null> {
  const tokenHash = hashPortalToken(rawToken);
  const link = await prisma.clientPortalMagicLink.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      clientId: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (!link || link.consumedAt || link.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  await prisma.clientPortalMagicLink.update({
    where: { id: link.id },
    data: { consumedAt: new Date() },
  });

  return { clientId: link.clientId };
}

export type InviteClientToPortalResult =
  | { ok: true; email: string; debugUrl?: string }
  | { ok: false; error: string; status: 400 | 404 | 502 };

/**
 * Staff action: email a portal magic link for one client in the active company.
 */
export async function inviteClientToPortal(input: {
  clientId: string;
  companyId: string;
}): Promise<InviteClientToPortalResult> {
  const client = await prisma.client.findFirst({
    where: { id: input.clientId, companyId: input.companyId },
    select: {
      id: true,
      name: true,
      email: true,
      company: { select: { name: true } },
    },
  });

  if (!client) {
    return { ok: false, error: "Client not found", status: 404 };
  }

  const email = client.email ? normalizePortalEmail(client.email) : "";
  if (!email || !email.includes("@")) {
    return {
      ok: false,
      error: "Add an email on this client before inviting them to the portal",
      status: 400,
    };
  }

  const rawToken = generatePortalToken();
  const origin = await getAppOrigin();
  const url = `${origin}/portal/auth/callback?token=${encodeURIComponent(rawToken)}`;

  await prisma.clientPortalMagicLink.create({
    data: {
      clientId: client.id,
      email,
      tokenHash: hashPortalToken(rawToken),
      expiresAt: new Date(Date.now() + PORTAL_MAGIC_LINK_TTL_MS),
    },
  });

  const link = { companyName: client.company.name, url };

  if (isEmailConfigured()) {
    try {
      await sendClientPortalMagicLinkEmail({
        to: email,
        clientName: client.name,
        invitedByStaff: true,
        links: [link],
      });
      return { ok: true, email };
    } catch (error) {
      console.error("[portal invite]", error);
      return {
        ok: false,
        error: "Could not send the portal invite email. Try again shortly.",
        status: 502,
      };
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return { ok: true, email, debugUrl: url };
  }

  return {
    ok: false,
    error: "Email is not configured, so the portal invite could not be sent",
    status: 502,
  };
}
