import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import {
  createProjectExpense,
  listProjectExpenses,
  serializeProjectExpense,
} from "@/lib/project-expenses";
import { createProjectExpenseSchema } from "@/lib/schemas/project-expense";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: projectId } = await context.params;
  const expenses = await listProjectExpenses(member.companyId, projectId);
  return NextResponse.json({ expenses: expenses.map(serializeProjectExpense) });
}

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: projectId } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = createProjectExpenseSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const expense = await createProjectExpense(member.companyId, projectId, parsed.data);
    return NextResponse.json({ expense: serializeProjectExpense(expense) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create expense";
    const status = message === "Project not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
