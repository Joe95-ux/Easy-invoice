import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import {
  getBillableExpensesByIds,
  serializeProjectExpense,
} from "@/lib/project-expenses";

/** Fetch billable, uninvoiced expenses by id (for invoice prefill). */
export async function GET(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ expenses: [] });
  }

  const expenses = await getBillableExpensesByIds(member.companyId, ids);
  return NextResponse.json({ expenses: expenses.map(serializeProjectExpense) });
}
