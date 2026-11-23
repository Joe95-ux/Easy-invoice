import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { getRetentionCampaign, serializeRetentionCampaign } from "@/lib/retention/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const campaign = await getRetentionCampaign(member.companyId, id);
  if (!campaign) {
    return NextResponse.json({ error: "Outreach not found" }, { status: 404 });
  }

  return NextResponse.json({ campaign: serializeRetentionCampaign(campaign) });
}
