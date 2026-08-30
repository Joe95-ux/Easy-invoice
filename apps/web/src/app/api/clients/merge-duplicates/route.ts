import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { mergeAllClientEmailDuplicates } from "@/lib/clients/merge-duplicates";

/** Merge clients that share the same email within the active company. */
export async function POST() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  try {
    const result = await mergeAllClientEmailDuplicates(member.companyId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[clients merge-duplicates]", error);
    return NextResponse.json(
      { error: "Could not merge duplicate clients" },
      { status: 500 },
    );
  }
}
