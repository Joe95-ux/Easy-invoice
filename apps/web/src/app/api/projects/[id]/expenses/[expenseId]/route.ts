import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import {
  deleteProjectExpense,
  getProjectExpenseForCompany,
  serializeProjectExpense,
  updateProjectExpense,
} from "@/lib/project-expenses";
import { updateProjectExpenseSchema } from "@/lib/schemas/project-expense";

type RouteContext = { params: Promise<{ id: string; expenseId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: projectId, expenseId } = await context.params;
  const expense = await getProjectExpenseForCompany(member.companyId, projectId, expenseId);
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  return NextResponse.json({ expense: serializeProjectExpense(expense) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: projectId, expenseId } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = updateProjectExpenseSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const expense = await updateProjectExpense(
      member.companyId,
      projectId,
      expenseId,
      parsed.data,
    );
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    return NextResponse.json({ expense: serializeProjectExpense(expense) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update expense";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id: projectId, expenseId } = await context.params;

  try {
    const deleted = await deleteProjectExpense(member.companyId, projectId, expenseId);
    if (!deleted) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete expense";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
