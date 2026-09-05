import { prisma } from "@/lib/db";
import type {
  CreateProjectExpenseInput,
  UpdateProjectExpenseInput,
} from "@/lib/schemas/project-expense";

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function parseDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  return date;
}

const expenseInclude = {
  invoice: { select: { id: true, number: true } },
} as const;

export async function listProjectExpenses(companyId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true },
  });
  if (!project) return [];

  return prisma.projectExpense.findMany({
    where: { projectId, companyId },
    include: expenseInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export async function getProjectExpenseForCompany(
  companyId: string,
  projectId: string,
  expenseId: string,
) {
  return prisma.projectExpense.findFirst({
    where: { id: expenseId, projectId, companyId },
    include: expenseInclude,
  });
}

export async function createProjectExpense(
  companyId: string,
  projectId: string,
  input: CreateProjectExpenseInput,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true, clientId: true, currency: true },
  });
  if (!project) throw new Error("Project not found");

  return prisma.projectExpense.create({
    data: {
      companyId,
      projectId,
      clientId: project.clientId,
      description: input.description.trim(),
      date: parseDate(input.date),
      amount: input.amount,
      currency: project.currency,
      billable: input.billable ?? false,
    },
    include: expenseInclude,
  });
}

export async function updateProjectExpense(
  companyId: string,
  projectId: string,
  expenseId: string,
  input: UpdateProjectExpenseInput,
) {
  const existing = await prisma.projectExpense.findFirst({
    where: { id: expenseId, projectId, companyId },
    select: { id: true, invoicedAt: true },
  });
  if (!existing) return null;

  if (existing.invoicedAt && (input.amount !== undefined || input.billable === false)) {
    throw new Error("Invoiced expenses cannot change amount or billable status");
  }

  return prisma.projectExpense.update({
    where: { id: expenseId },
    data: {
      ...(input.description !== undefined && { description: input.description.trim() }),
      ...(input.date !== undefined && { date: parseDate(input.date) }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.billable !== undefined && { billable: input.billable }),
    },
    include: expenseInclude,
  });
}

export async function deleteProjectExpense(
  companyId: string,
  projectId: string,
  expenseId: string,
) {
  const existing = await prisma.projectExpense.findFirst({
    where: { id: expenseId, projectId, companyId },
    select: { id: true, invoicedAt: true },
  });
  if (!existing) return false;
  if (existing.invoicedAt) {
    throw new Error("Invoiced expenses cannot be deleted");
  }

  await prisma.projectExpense.delete({ where: { id: expenseId } });
  return true;
}

export function serializeProjectExpense(
  expense: Awaited<ReturnType<typeof listProjectExpenses>>[number],
) {
  return {
    id: expense.id,
    description: expense.description,
    date: expense.date.toISOString(),
    amount: toNumber(expense.amount),
    currency: expense.currency,
    billable: expense.billable,
    invoiceId: expense.invoiceId,
    invoiceNumber: expense.invoice?.number ?? null,
    invoicedAt: expense.invoicedAt?.toISOString() ?? null,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}
