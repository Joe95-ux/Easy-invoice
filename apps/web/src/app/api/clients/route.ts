import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { prisma } from "@/lib/db";
import { clientSchema } from "@/lib/schemas/client";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const clients = await getClientsForMember(member.companyId);
  return NextResponse.json({ clients });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

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
