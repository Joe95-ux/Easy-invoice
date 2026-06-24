import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { getTemplatesForCompany } from "@/lib/templates";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const templates = await getTemplatesForCompany(member.companyId);
  return NextResponse.json({ templates });
}
