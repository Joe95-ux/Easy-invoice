import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ token: string }> };

/** Public preview for accept-invite page (no auth required). */
export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  const invite = await prisma.companyInvite.findUnique({
    where: { token },
    include: { company: { select: { name: true } } },
  });

  if (!invite || invite.acceptedAt) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    companyName: invite.company.name,
    expiresAt: invite.expiresAt.toISOString(),
  });
}
