import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { companySettingsSchema } from "@/lib/schemas/invoice";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  return NextResponse.json({ company: member.company });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = companySettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const company = await prisma.company.update({
    where: { id: member.companyId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      zip: parsed.data.zip || null,
      country: parsed.data.country,
      currency: parsed.data.currency,
      locale: parsed.data.locale,
      taxId: parsed.data.taxId || null,
    },
  });

  return NextResponse.json({ company });
}
