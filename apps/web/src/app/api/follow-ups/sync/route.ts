import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import {
  serializeFollowUp,
  syncFollowUpSuggestions,
} from "@/lib/follow-ups/service";

export async function POST() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  try {
    const result = await syncFollowUpSuggestions(member.companyId, member.id);
    return NextResponse.json({
      created: result.created,
      updated: result.updated,
      resolved: result.resolved,
      followUps: result.items.map(serializeFollowUp),
    });
  } catch (error) {
    console.error("[POST /api/follow-ups/sync]", error);
    const message = error instanceof Error ? error.message : "Failed to sync follow-ups";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
