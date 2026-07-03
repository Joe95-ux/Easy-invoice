import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { recordAuditEvent } from "@/lib/audit/service";
import { getClientForMember } from "@/lib/clients";
import { AuditAction, AuditCategory, prisma } from "@/lib/db";
import { clientSchema } from "@/lib/schemas/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const client = await getClientForMember(id, member.companyId);

  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ client });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const existing = await getClientForMember(id, member.companyId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const client = await prisma.client.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      zip: parsed.data.zip || null,
      country: parsed.data.country || null,
      notes: parsed.data.notes || null,
    },
  });

  return NextResponse.json({ client });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const existing = await getClientForMember(id, member.companyId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.client.delete({ where: { id } });

  await recordAuditEvent({
    companyId: member.companyId,
    memberId: member.id,
    category: AuditCategory.DOCUMENT,
    action: AuditAction.CLIENT_DELETED,
    summary: `Deleted client ${existing.name}`,
    entityType: "client",
    entityId: id,
    metadata: { name: existing.name, email: existing.email },
  });

  return NextResponse.json({ success: true });
}
