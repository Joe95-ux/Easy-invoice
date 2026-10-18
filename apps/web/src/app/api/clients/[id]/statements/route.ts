import { NextResponse } from "next/server";
import { requireApiMember, requireApiWriter } from "@/lib/api/validation";
import { isPlanLimitError, planLimitResponse } from "@/lib/billing/entitlements";
import { prisma } from "@/lib/db";
import { createAndSendClientStatement } from "@/lib/statements";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const statements = await prisma.clientStatement.findMany({
    where: { clientId: id, companyId: member.companyId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      number: true,
      issuedAt: true,
      totalDue: true,
      currency: true,
      toEmail: true,
    },
  });
  return NextResponse.json({ statements });
}

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const { id } = await context.params;
  const raw = await request.json().catch(() => ({}));
  const toEmail =
    raw && typeof raw === "object" && "toEmail" in raw && typeof raw.toEmail === "string"
      ? raw.toEmail
      : undefined;

  try {
    const result = await createAndSendClientStatement({
      clientId: id,
      companyId: member.companyId,
      memberId: member.id,
      toEmail,
    });
    return NextResponse.json({ statement: result.statement, viewUrl: result.viewUrl }, { status: 201 });
  } catch (error) {
    if (isPlanLimitError(error)) return planLimitResponse(error);
    const message = error instanceof Error ? error.message : "Could not send statement";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
