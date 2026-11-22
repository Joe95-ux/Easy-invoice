import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import {
  countRetentionSegments,
  RETENTION_SEGMENT_DESCRIPTION,
  RETENTION_SEGMENT_LABEL,
  RETENTION_SEGMENTS,
} from "@/lib/retention/segments";
import { RETENTION_MAX_RECIPIENTS } from "@/lib/retention/service";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const counts = await countRetentionSegments(member.companyId);

  return NextResponse.json({
    maxRecipients: RETENTION_MAX_RECIPIENTS,
    segments: RETENTION_SEGMENTS.map((id) => ({
      id,
      label: RETENTION_SEGMENT_LABEL[id],
      description: RETENTION_SEGMENT_DESCRIPTION[id],
      count: counts[id],
    })),
  });
}
