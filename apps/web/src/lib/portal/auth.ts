import "server-only";

import { prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";
import { isEmailConfigured, sendClientPortalMagicLinkEmail } from "@/lib/email";
import {
  createPortalSession,
  type PortalSessionClient,
} from "@/lib/portal/session";
import type { PortalAccountOption } from "@/lib/portal/types";
import {
  generatePortalToken,
  hashPortalToken,
  normalizePortalEmail,
  PORTAL_MAGIC_LINK_TTL_MS,
} from "@/lib/portal/tokens";

export type { PortalAccountOption } from "@/lib/portal/types";
export type PortalMagicLinkRequestResult = {
  /** Always true to callers — never reveal whether the email matched. */
  ok: true;
  /** Dev-only: callback URLs when email is not configured. */
  debugLinks?: Array<{ companyName: string; url: string }>;
};

async function createMagicLinkUrl(input: {
  clientId: string;
  email: string;
}): Promise<{ url: string; companyName: string }> {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: input.clientId },
    select: { company: { select: { name: true } } },
  });
  const rawToken = generatePortalToken();
  const origin = await getAppOrigin();
  await prisma.clientPortalMagicLink.create({
    data: {
      clientId: input.clientId,
      email: input.email,
      tokenHash: hashPortalToken(rawToken),
      expiresAt: new Date(Date.now() + PORTAL_MAGIC_LINK_TTL_MS),
    },
  });
  return {
    companyName: client.company.name,
    url: `${origin}/portal/auth/callback?token=${encodeURIComponent(rawToken)}`,
  };
}

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
      companyId: true,
      company: { select: { name: true } },
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  if (clients.length === 0) {
    return { ok: true };
  }

  // One magic link per company — duplicate client rows with the same email
  // must not produce multiple identical "Open X portal" buttons.
  const uniqueByCompany = new Map<string, (typeof clients)[number]>();
  for (const client of clients) {
    if (!uniqueByCompany.has(client.companyId)) {
      uniqueByCompany.set(client.companyId, client);
    }
  }

  const links: Array<{ companyName: string; url: string }> = [];
  for (const client of uniqueByCompany.values()) {
    const link = await createMagicLinkUrl({
      clientId: client.id,
      email: client.email ? normalizePortalEmail(client.email) : email,
    });
    links.push(link);
  }

  if (isEmailConfigured()) {
    await sendClientPortalMagicLinkEmail({ to: email, links });
    return { ok: true };
  }

  if (process.env.NODE_ENV !== "production") {
    return { ok: true, debugLinks: links };
  }

  return { ok: true };
}

/** Consume a one-time magic link atomically; returns null if invalid/used/expired. */
export async function consumePortalMagicLink(rawToken: string): Promise<{
  clientId: string;
} | null> {
  const tokenHash = hashPortalToken(rawToken);
  const now = new Date();

  const link = await prisma.clientPortalMagicLink.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      clientId: true,
      expiresAt: true,
      consumedAt: true,
    },
  });

  if (!link || link.consumedAt || link.expiresAt.getTime() <= now.getTime()) {
    return null;
  }

  const consumed = await prisma.clientPortalMagicLink.updateMany({
    where: {
      id: link.id,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    data: { consumedAt: now },
  });

  if (consumed.count !== 1) {
    return null;
  }

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

  const link = await createMagicLinkUrl({ clientId: client.id, email });

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
    return { ok: true, email, debugUrl: link.url };
  }

  return {
    ok: false,
    error: "Email is not configured, so the portal invite could not be sent",
    status: 502,
  };
}

/** Other companies the same email can open in the portal. */
export async function listPortalAccountsForSession(
  session: PortalSessionClient,
): Promise<PortalAccountOption[]> {
  const email = session.clientEmail
    ? normalizePortalEmail(session.clientEmail)
    : "";
  if (!email) {
    return [
      {
        clientId: session.clientId,
        clientName: session.clientName,
        companyId: session.companyId,
        companyName: session.companyName,
        isCurrent: true,
      },
    ];
  }

  const clients = await prisma.client.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      companyId: true,
      company: { select: { name: true } },
    },
    orderBy: { company: { name: "asc" } },
    take: 50,
  });

  // One entry per company — duplicate client rows with the same email must not
  // appear as separate switcher options.
  const byCompany = new Map<string, PortalAccountOption>();
  for (const client of clients) {
    const isCurrent = client.id === session.clientId;
    const existing = byCompany.get(client.companyId);
    if (!existing || isCurrent) {
      byCompany.set(client.companyId, {
        clientId: client.id,
        clientName: client.name,
        companyId: client.companyId,
        companyName: client.company.name,
        isCurrent,
      });
    }
  }

  return Array.from(byCompany.values()).sort((a, b) =>
    a.companyName.localeCompare(b.companyName),
  );
}

/**
 * Switch the portal session to another client record that shares the same email.
 */
export async function switchPortalAccount(input: {
  session: PortalSessionClient;
  targetClientId: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: 400 | 404 }> {
  if (input.targetClientId === input.session.clientId) {
    return { ok: true };
  }

  const email = input.session.clientEmail
    ? normalizePortalEmail(input.session.clientEmail)
    : "";
  if (!email) {
    return {
      ok: false,
      error: "This portal session cannot switch companies",
      status: 400,
    };
  }

  const target = await prisma.client.findFirst({
    where: {
      id: input.targetClientId,
      email: { equals: email, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (!target) {
    return { ok: false, error: "Company not found for this email", status: 404 };
  }

  await createPortalSession(target.id);
  return { ok: true };
}

