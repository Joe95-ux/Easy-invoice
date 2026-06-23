import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { getTemplatesForCompany } from "@/lib/templates";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const templates = await getTemplatesForCompany(member.companyId);
  return NextResponse.json({ templates });
}
