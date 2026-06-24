import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { getClientsForMember } from "@/lib/clients";
import { prisma } from "@/lib/db";
import { clientSchema } from "@/lib/schemas/client";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const clients = await getClientsForMember(member.companyId);
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const client = await prisma.client.create({
    data: {
      companyId: member.companyId,
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

  return NextResponse.json({ client }, { status: 201 });
}
