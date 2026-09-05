import { Prisma } from "@easy-invoice/db";
import { prisma, type ProjectStatus } from "@/lib/db";
import {
  computeBalanceDue,
  sumPaymentAmounts,
} from "@/lib/invoice-payments-utils";
import type { CreateProjectInput, UpdateProjectInput } from "@/lib/schemas/project";

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const projectListInclude = {
  client: { select: { id: true, name: true, email: true } },
  _count: {
    select: {
      estimates: true,
      invoices: true,
      timeEntries: true,
    },
  },
} satisfies Prisma.ProjectInclude;

export const projectDetailInclude = {
  client: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
  estimates: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      currency: true,
      acceptedAt: true,
      validUntil: true,
    },
  },
  invoices: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      currency: true,
      dueDate: true,
      payments: { select: { amount: true } },
    },
  },
  timeEntries: {
    orderBy: [{ date: "desc" as const }, { createdAt: "desc" as const }],
    take: 100,
    select: {
      id: true,
      description: true,
      date: true,
      durationMinutes: true,
      hourlyRate: true,
      billable: true,
      invoicedAt: true,
      invoiceId: true,
    },
  },
  expenses: {
    orderBy: [{ date: "desc" as const }, { createdAt: "desc" as const }],
    take: 100,
    select: {
      id: true,
      description: true,
      date: true,
      amount: true,
      currency: true,
      billable: true,
      invoicedAt: true,
      invoiceId: true,
      invoice: { select: { id: true, number: true } },
    },
  },
} satisfies Prisma.ProjectInclude;

export type ProjectListRow = Awaited<ReturnType<typeof getProjectsForCompany>>[number];
export type ProjectDetail = NonNullable<Awaited<ReturnType<typeof getProjectForCompany>>>;

export async function getProjectsForCompany(companyId: string) {
  return prisma.project.findMany({
    where: { companyId },
    include: projectListInclude,
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function getProjectForCompany(projectId: string, companyId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, companyId },
    include: projectDetailInclude,
  });
}

export function projectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "ACTIVE":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

export function projectStatusVariant(
  status: ProjectStatus,
): "secondary" | "default" | "success" | "destructive" {
  switch (status) {
    case "DRAFT":
      return "secondary";
    case "ACTIVE":
      return "default";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function summarizeProjectFinancials(
  project: {
    currency: string;
    budget: { toString(): string } | number | null;
    estimates: Array<{ total: { toString(): string } | number; status: string }>;
    invoices: Array<{
      total: { toString(): string } | number;
      status: string;
      payments: Array<{ amount: { toString(): string } | number }>;
    }>;
    timeEntries: Array<{
      durationMinutes: number;
      hourlyRate: { toString(): string } | number;
      billable: boolean;
      invoicedAt: Date | null;
    }>;
    expenses?: Array<{
      amount: { toString(): string } | number;
      billable: boolean;
      invoicedAt: Date | null;
    }>;
  },
) {
  const currency = project.currency;
  const budget = project.budget == null ? null : toNumber(project.budget);

  const estimateTotal = project.estimates.reduce((sum, row) => sum + toNumber(row.total), 0);

  let invoiced = 0;
  let paid = 0;
  for (const invoice of project.invoices) {
    if (invoice.status === "CANCELLED") continue;
    invoiced += toNumber(invoice.total);
    paid += sumPaymentAmounts(
      invoice.payments.map((payment) => ({ amount: toNumber(payment.amount) })),
    );
  }
  const remaining = computeBalanceDue(invoiced, paid);

  let timeMinutes = 0;
  let unbilledAmount = 0;
  let unbilledMinutes = 0;
  for (const entry of project.timeEntries) {
    timeMinutes += entry.durationMinutes;
    if (entry.billable && !entry.invoicedAt) {
      unbilledMinutes += entry.durationMinutes;
      unbilledAmount += (entry.durationMinutes / 60) * toNumber(entry.hourlyRate);
    }
  }

  let expensesTotal = 0;
  let expensesBillableUninvoiced = 0;
  for (const expense of project.expenses ?? []) {
    const amount = toNumber(expense.amount);
    expensesTotal += amount;
    if (expense.billable && !expense.invoicedAt) {
      expensesBillableUninvoiced += amount;
    }
  }
  expensesTotal = Math.round(expensesTotal * 100) / 100;
  expensesBillableUninvoiced = Math.round(expensesBillableUninvoiced * 100) / 100;

  /** Revenue for margin uses Paid (cash collected). */
  const revenue = paid;
  const costs = expensesTotal;
  const profit = Math.round((revenue - costs) * 100) / 100;
  const marginPercent =
    revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : null;

  return {
    currency,
    budget,
    estimateTotal,
    invoiced,
    paid,
    remaining,
    timeMinutes,
    unbilledMinutes,
    unbilledAmount: Math.round(unbilledAmount * 100) / 100,
    expensesTotal,
    expensesBillableUninvoiced,
    revenue,
    costs,
    profit,
    marginPercent,
  };
}

export async function createProject(companyId: string, input: CreateProjectInput) {
  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, companyId },
      select: { id: true },
    });
    if (!client) throw new Error("Client not found");
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { currency: true },
  });

  const project = await prisma.project.create({
    data: {
      companyId,
      clientId: input.clientId || null,
      name: input.name.trim(),
      status: input.status ?? "ACTIVE",
      startDate: parseOptionalDate(input.startDate),
      dueDate: parseOptionalDate(input.dueDate),
      currency: (input.currency ?? company?.currency ?? "USD").toUpperCase(),
      budget: input.budget ?? null,
      notes: input.notes?.trim() || null,
    },
  });

  if (input.estimateId) {
    await linkEstimateToProject(companyId, project.id, input.estimateId);
  }
  if (input.invoiceId) {
    await linkInvoiceToProject(companyId, project.id, input.invoiceId);
  }

  return getProjectForCompany(project.id, companyId);
}

export async function updateProject(
  companyId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true },
  });
  if (!existing) return null;

  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, companyId },
      select: { id: true },
    });
    if (!client) throw new Error("Client not found");
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.clientId !== undefined && { clientId: input.clientId || null }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: parseOptionalDate(input.startDate) }),
      ...(input.dueDate !== undefined && { dueDate: parseOptionalDate(input.dueDate) }),
      ...(input.currency !== undefined && { currency: input.currency.toUpperCase() }),
      ...(input.budget !== undefined && { budget: input.budget }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
    },
  });

  if (input.estimateId) {
    await linkEstimateToProject(companyId, projectId, input.estimateId);
  }
  if (input.invoiceId) {
    await linkInvoiceToProject(companyId, projectId, input.invoiceId);
  }

  return getProjectForCompany(projectId, companyId);
}

export async function deleteProject(companyId: string, projectId: string) {
  const existing = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.project.delete({ where: { id: projectId } });
  return true;
}

export async function linkEstimateToProject(
  companyId: string,
  projectId: string,
  estimateId: string,
) {
  const [project, estimate] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, companyId }, select: { id: true, clientId: true } }),
    prisma.estimate.findFirst({
      where: { id: estimateId, companyId },
      select: { id: true, clientId: true, projectId: true },
    }),
  ]);
  if (!project || !estimate) throw new Error("Not found");

  await prisma.estimate.update({
    where: { id: estimateId },
    data: { projectId },
  });

  if (!project.clientId && estimate.clientId) {
    await prisma.project.update({
      where: { id: projectId },
      data: { clientId: estimate.clientId },
    });
  }
}

export async function linkInvoiceToProject(
  companyId: string,
  projectId: string,
  invoiceId: string,
) {
  const [project, invoice] = await Promise.all([
    prisma.project.findFirst({ where: { id: projectId, companyId }, select: { id: true, clientId: true } }),
    prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      select: { id: true, clientId: true },
    }),
  ]);
  if (!project || !invoice) throw new Error("Not found");

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { projectId },
  });

  if (!project.clientId && invoice.clientId) {
    await prisma.project.update({
      where: { id: projectId },
      data: { clientId: invoice.clientId },
    });
  }
}

/**
 * Create a project from an accepted estimate when none is linked yet.
 * Honors company.createProjectOnEstimateAccept unless force is true.
 */
export async function maybeCreateProjectFromAcceptedEstimate(
  companyId: string,
  estimateId: string,
  options?: { force?: boolean },
) {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    select: {
      id: true,
      number: true,
      clientId: true,
      currency: true,
      total: true,
      projectId: true,
      notes: true,
      scope: true,
      client: { select: { name: true } },
      company: { select: { createProjectOnEstimateAccept: true, currency: true } },
    },
  });
  if (!estimate) return null;
  if (estimate.projectId) {
    return getProjectForCompany(estimate.projectId, companyId);
  }
  if (!options?.force && !estimate.company.createProjectOnEstimateAccept) {
    return null;
  }

  const clientLabel = estimate.client?.name?.trim();
  const name = clientLabel
    ? `${clientLabel} · ${estimate.number}`
    : `Project from ${estimate.number}`;

  const project = await prisma.project.create({
    data: {
      companyId,
      clientId: estimate.clientId,
      name,
      status: "ACTIVE",
      startDate: new Date(),
      currency: estimate.currency || estimate.company.currency || "USD",
      budget: estimate.total,
      notes: [estimate.scope, estimate.notes].filter(Boolean).join("\n\n") || null,
      estimates: { connect: { id: estimate.id } },
    },
  });

  return getProjectForCompany(project.id, companyId);
}

export function serializeProjectListItem(
  project: Awaited<ReturnType<typeof getProjectsForCompany>>[number],
) {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    startDate: project.startDate?.toISOString() ?? null,
    dueDate: project.dueDate?.toISOString() ?? null,
    currency: project.currency,
    budget: project.budget == null ? null : toNumber(project.budget),
    clientId: project.clientId,
    clientName: project.client?.name ?? null,
    estimateCount: project._count.estimates,
    invoiceCount: project._count.invoices,
    timeEntryCount: project._count.timeEntries,
    updatedAt: project.updatedAt.toISOString(),
  };
}

export function serializeProjectDetail(project: ProjectDetail) {
  const financials = summarizeProjectFinancials(project);
  const unbilledTimeIds = project.timeEntries
    .filter((entry) => entry.billable && !entry.invoicedAt)
    .map((entry) => entry.id);
  const unbilledExpenseIds = project.expenses
    .filter((expense) => expense.billable && !expense.invoicedAt)
    .map((expense) => expense.id);

  return {
    id: project.id,
    name: project.name,
    status: project.status,
    startDate: project.startDate?.toISOString() ?? null,
    dueDate: project.dueDate?.toISOString() ?? null,
    currency: project.currency,
    budget: project.budget == null ? null : toNumber(project.budget),
    notes: project.notes,
    client: project.client
      ? {
          id: project.client.id,
          name: project.client.name,
          email: project.client.email,
          phone: project.client.phone,
        }
      : null,
    estimates: project.estimates.map((row) => ({
      id: row.id,
      number: row.number,
      status: row.status,
      total: toNumber(row.total),
      currency: row.currency,
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      validUntil: row.validUntil?.toISOString() ?? null,
    })),
    invoices: project.invoices.map((row) => {
      const amountPaid = sumPaymentAmounts(
        row.payments.map((payment) => ({ amount: toNumber(payment.amount) })),
      );
      return {
        id: row.id,
        number: row.number,
        status: row.status,
        total: toNumber(row.total),
        currency: row.currency,
        dueDate: row.dueDate?.toISOString() ?? null,
        amountPaid,
        balanceDue: computeBalanceDue(row.total, amountPaid),
      };
    }),
    timeEntries: project.timeEntries.map((row) => ({
      id: row.id,
      description: row.description,
      date: row.date.toISOString(),
      durationMinutes: row.durationMinutes,
      hourlyRate: toNumber(row.hourlyRate),
      billable: row.billable,
      invoicedAt: row.invoicedAt?.toISOString() ?? null,
      invoiceId: row.invoiceId,
      amount: Math.round((row.durationMinutes / 60) * toNumber(row.hourlyRate) * 100) / 100,
    })),
    expenses: project.expenses.map((row) => ({
      id: row.id,
      description: row.description,
      date: row.date.toISOString(),
      amount: toNumber(row.amount),
      currency: row.currency,
      billable: row.billable,
      invoicedAt: row.invoicedAt?.toISOString() ?? null,
      invoiceId: row.invoiceId,
      invoiceNumber: row.invoice?.number ?? null,
    })),
    financials,
    unbilledTimeIds,
    unbilledExpenseIds,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
