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

type LineItemExpenseLink = {
  sortOrder: number;
  expenseIds?: string[];
};

/** Stamp billable expenses onto an invoice (invoiceId + invoicedAt). */
export async function linkProjectExpensesToInvoice(
  companyId: string,
  invoiceId: string,
  lineItems: LineItemExpenseLink[],
) {
  const links = lineItems
    .map((item, index) => ({
      sortOrder: item.sortOrder ?? index,
      expenseIds: item.expenseIds ?? [],
    }))
    .filter((item) => item.expenseIds.length > 0);

  if (links.length === 0) return;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    select: { clientId: true, projectId: true },
  });
  if (!invoice) throw new Error("Invoice not found");

  const allExpenseIds = [...new Set(links.flatMap((item) => item.expenseIds))];
  const expenses = await prisma.projectExpense.findMany({
    where: {
      id: { in: allExpenseIds },
      companyId,
      billable: true,
      invoicedAt: null,
      ...(invoice.clientId
        ? { OR: [{ clientId: invoice.clientId }, { clientId: null }] }
        : {}),
      ...(invoice.projectId ? { projectId: invoice.projectId } : {}),
    },
    select: { id: true },
  });

  if (expenses.length !== allExpenseIds.length) {
    throw new Error("One or more expenses are no longer available to bill");
  }

  const now = new Date();
  await prisma.projectExpense.updateMany({
    where: {
      id: { in: allExpenseIds },
      companyId,
      invoicedAt: null,
    },
    data: {
      invoiceId,
      invoicedAt: now,
      ...(invoice.clientId ? { clientId: invoice.clientId } : {}),
    },
  });
}

export async function releaseProjectExpensesForInvoice(invoiceId: string) {
  await prisma.projectExpense.updateMany({
    where: { invoiceId },
    data: {
      invoiceId: null,
      invoicedAt: null,
    },
  });
}

export async function getBillableExpensesByIds(companyId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.projectExpense.findMany({
    where: {
      id: { in: ids },
      companyId,
      billable: true,
      invoicedAt: null,
    },
    include: expenseInclude,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

export async function getExpensesForInvoice(companyId: string, invoiceId: string) {
  return prisma.projectExpense.findMany({
    where: { companyId, invoiceId },
    select: {
      id: true,
      description: true,
      amount: true,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

/**
 * Attach expenseIds onto invoice line items for draft edit hydration.
 * Matches qty-1 lines by description + amount; each expense used once.
 */
export function attachExpenseIdsToLineItems<
  T extends {
    description: string;
    quantity: number;
    unitPrice: number;
    timeEntryIds?: string[];
    expenseIds?: string[];
  },
>(
  lineItems: T[],
  expenses: Array<{ id: string; description: string; amount: { toString(): string } | number }>,
): T[] {
  const remaining = expenses.map((expense) => ({
    id: expense.id,
    description: expense.description.trim(),
    amount: toNumber(expense.amount),
  }));

  return lineItems.map((item) => {
    if ((item.timeEntryIds?.length ?? 0) > 0) return item;
    if (item.quantity !== 1) return item;

    const matchIndex = remaining.findIndex(
      (expense) =>
        expense.description === item.description.trim() &&
        Math.abs(expense.amount - item.unitPrice) < 0.005,
    );
    if (matchIndex < 0) return item;

    const [matched] = remaining.splice(matchIndex, 1);
    return {
      ...item,
      expenseIds: [matched!.id],
    };
  });
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
