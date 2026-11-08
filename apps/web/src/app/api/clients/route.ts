import { NextResponse } from "next/server";
import {
  requireApiMember,
  requireApiWriter,
  parseJsonBody,
  validationError,
} from "@/lib/api/validation";
import { getClientsForMember, type ClientArchiveFilter } from "@/lib/clients";
import { prisma } from "@/lib/db";
import { clientSchema } from "@/lib/schemas/client";

function parseArchiveFilter(value: string | null): ClientArchiveFilter {
  if (value === "all" || value === "archived") return value;
  return "active";
}

export async function GET(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const archived = parseArchiveFilter(new URL(request.url).searchParams.get("archived"));
  const clients = await getClientsForMember(member.companyId, archived);
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiWriter();
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
      defaultHourlyRate: parsed.data.defaultHourlyRate ?? null,
    },
  });

  return NextResponse.json({ client }, { status: 201 });
}
