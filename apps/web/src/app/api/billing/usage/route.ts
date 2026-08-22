import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { getCompanyUsage } from "@/lib/billing/entitlements";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const usage = await getCompanyUsage(member.companyId, member.company.plan);
  return NextResponse.json({ usage });
}
