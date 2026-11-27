import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  requireApiWriter,
  validationError,
} from "@/lib/api/validation";
import { PlanLimitError, planLimitResponse } from "@/lib/billing/entitlements";
import { createRetentionCampaignSchema } from "@/lib/schemas/retention";
import { getAppOrigin } from "@/lib/app-url";
import { scheduleRetentionBatch } from "@/lib/retention/dispatch";
import {
  getRetentionCampaigns,
  sendRetentionCampaign,
  serializeRetentionCampaign,
} from "@/lib/retention/service";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const campaigns = await getRetentionCampaigns(member.companyId);
  return NextResponse.json({
    campaigns: campaigns.map(serializeRetentionCampaign),
  });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = createRetentionCampaignSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const campaign = await sendRetentionCampaign({
      companyId: member.companyId,
      memberId: member.id,
      plan: member.company.plan,
      segment: parsed.data.segment,
      subject: parsed.data.subject,
      message: parsed.data.message,
      name: parsed.data.name,
    });
    scheduleRetentionBatch(campaign.id, await getAppOrigin());

    return NextResponse.json(
      { campaign: serializeRetentionCampaign(campaign) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PlanLimitError) return planLimitResponse(error);
    const message = error instanceof Error ? error.message : "Could not send outreach";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
