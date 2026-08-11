import type {
  RecurringFrequency,
  RecurringInvoiceStatus,
} from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import { buildInvoiceTotals, generateNextInvoiceNumber } from "@/lib/invoice-service";
import { startOfUtcDay } from "@/lib/reminders/dates";
import {
  loadInvoiceSnapshot,
  recordDocumentRevision,
} from "@/lib/document-revisions/service";
import { getDefaultTemplateId, getTemplateById } from "@/lib/templates";
import { getAppOrigin } from "@/lib/app-url";
import { publicDocumentUrl } from "@/lib/document-tokens";
import { sendInvoiceEmail } from "@/lib/email";
import { generateInvoicePdfBuffer } from "@/lib/invoice-service";
import { formatMoney } from "@/lib/invoices";
import { ensureInvoicePublicToken } from "@/lib/public-documents";
import type {
  CreateRecurringFromInvoiceInput,
  CreateRecurringInvoiceInput,
  UpdateRecurringInvoiceInput,
} from "@/lib/schemas/recurring-invoice";
import type { SerializedRecurringInvoice } from "@/lib/recurring-invoices-shared";
import { frequencyLabel } from "@/lib/recurring-invoices-shared";

export type {
  SerializedRecurringInvoice,
  SerializedRecurringLineItem,
} from "@/lib/recurring-invoices-shared";
export {
  frequencyLabel,
  recurringStatusLabel,
  recurringStatusVariant,
} from "@/lib/recurring-invoices-shared";

function toDateOnlyString(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

/** Parse YYYY-MM-DD as a UTC calendar date (midnight UTC). */
export function parseUtcDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatUtcDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Advance a schedule date by frequency/interval.
 * Month/quarter/year use calendar math with day-of-month clamping (e.g. Jan 31 → Feb 28).
 */
export function advanceIssueDate(
  from: Date,
  frequency: RecurringFrequency,
  interval: number,
): Date {
  const safeInterval = Math.max(1, interval);
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth();
  const d = from.getUTCDate();

  if (frequency === "WEEKLY") {
    return new Date(Date.UTC(y, m, d + 7 * safeInterval));
  }

  let monthsToAdd = 0;
  if (frequency === "MONTHLY") monthsToAdd = safeInterval;
  else if (frequency === "QUARTERLY") monthsToAdd = 3 * safeInterval;
  else monthsToAdd = 12 * safeInterval; // YEARLY

  const targetMonth = m + monthsToAdd;
  const targetYear = y + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const daysInTarget = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(d, daysInTarget);
  return new Date(Date.UTC(targetYear, normalizedMonth, clampedDay));
}

function shouldEndSchedule(input: {
  nextIssueDate: Date;
  endDate: Date | null;
  maxOccurrences: number | null;
  occurrenceCount: number;
}): boolean {
  if (input.maxOccurrences != null && input.occurrenceCount >= input.maxOccurrences) {
    return true;
  }
  if (input.endDate && startOfUtcDay(input.nextIssueDate) > startOfUtcDay(input.endDate)) {
    return true;
  }
  return false;
}

function computeEstimatedTotal(input: {
  lineItems: { quantity: number; unitPrice: number }[];
  taxRate: number;
  discount: number;
}): number {
  const { totals } = buildInvoiceTotals({
    lineItems: input.lineItems.map((item, index) => ({
      description: "x",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      sortOrder: index,
    })),
    taxRate: input.taxRate,
    discount: input.discount,
  });
  return totals.total;
}

type RecurringWithRelations = {
  id: string;
  name: string;
  status: RecurringInvoiceStatus;
  frequency: RecurringFrequency;
  interval: number;
  startDate: Date;
  nextIssueDate: Date;
  endDate: Date | null;
  maxOccurrences: number | null;
  occurrenceCount: number;
  dueDaysAfterIssue: number;
  autoSend: boolean;
  currency: string;
  taxRate: { toString(): string } | number;
  discount: { toString(): string } | number;
  notes: string | null;
  templateId: string | null;
  sourceInvoiceId: string | null;
  lastIssuedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  client: { id: string; name: string; email: string | null };
  items: {
    id: string;
    description: string;
    quantity: { toString(): string } | number;
    unitPrice: { toString(): string } | number;
    sortOrder: number;
    sectionTitle: string | null;
    sectionSortOrder: number;
  }[];
  _count?: { invoices: number };
};

export function serializeRecurringInvoice(
  row: RecurringWithRelations,
): SerializedRecurringInvoice {
  const items = row.items
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.sectionSortOrder - b.sectionSortOrder)
    .map((item) => ({
      id: item.id,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      sortOrder: item.sortOrder,
      sectionTitle: item.sectionTitle,
      sectionSortOrder: item.sectionSortOrder,
    }));

  const taxRate = Number(row.taxRate);
  const discount = Number(row.discount);

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    frequency: row.frequency,
    interval: row.interval,
    startDate: toDateOnlyString(row.startDate),
    nextIssueDate: toDateOnlyString(row.nextIssueDate),
    endDate: row.endDate ? toDateOnlyString(row.endDate) : null,
    maxOccurrences: row.maxOccurrences,
    occurrenceCount: row.occurrenceCount,
    dueDaysAfterIssue: row.dueDaysAfterIssue,
    autoSend: row.autoSend,
    currency: row.currency,
    taxRate,
    discount,
    notes: row.notes,
    templateId: row.templateId,
    sourceInvoiceId: row.sourceInvoiceId,
    lastIssuedAt: row.lastIssuedAt?.toISOString() ?? null,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    client: row.client,
    items,
    estimatedTotal: computeEstimatedTotal({
      lineItems: items,
      taxRate,
      discount,
    }),
    invoicesCount: row._count?.invoices,
  };
}

const listInclude = {
  client: { select: { id: true, name: true, email: true } },
  items: { orderBy: [{ sectionSortOrder: "asc" as const }, { sortOrder: "asc" as const }] },
  _count: { select: { invoices: true } },
};

export async function listRecurringInvoices(
  companyId: string,
  filters?: { status?: RecurringInvoiceStatus },
) {
  return prisma.recurringInvoice.findMany({
    where: {
      companyId,
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: listInclude,
    orderBy: [{ status: "asc" }, { nextIssueDate: "asc" }, { name: "asc" }],
  });
}

export async function getRecurringInvoice(id: string, companyId: string) {
  return prisma.recurringInvoice.findFirst({
    where: { id, companyId },
    include: listInclude,
  });
}

async function assertClient(companyId: string, clientId: string) {
  return prisma.client.findFirst({ where: { id: clientId, companyId } });
}

async function resolveTemplateId(
  companyId: string,
  templateId: string | null | undefined,
): Promise<string | null> {
  if (templateId) {
    const template = await getTemplateById(templateId, companyId);
    if (!template) throw new Error("Template not found");
    return template.id;
  }
  return (await getDefaultTemplateId(companyId)) ?? null;
}

function mapLineItemCreates(
  lineItems: CreateRecurringInvoiceInput["lineItems"],
) {
  return lineItems.map((item, index) => ({
    description: item.description.trim(),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    sortOrder: item.sortOrder ?? index,
    sectionTitle: item.sectionTitle?.trim() || null,
    sectionSortOrder: item.sectionSortOrder ?? 0,
  }));
}

export async function createRecurringInvoice(
  companyId: string,
  memberId: string,
  input: CreateRecurringInvoiceInput,
) {
  const client = await assertClient(companyId, input.clientId);
  if (!client) throw new Error("Client not found");

  const templateId = await resolveTemplateId(companyId, input.templateId);
  const startDate = parseUtcDateOnly(input.startDate);
  const nextIssueDate = parseUtcDateOnly(input.nextIssueDate ?? input.startDate);
  const endDate = input.endDate ? parseUtcDateOnly(input.endDate) : null;

  return prisma.recurringInvoice.create({
    data: {
      companyId,
      memberId,
      clientId: client.id,
      name: input.name.trim(),
      status: "ACTIVE",
      frequency: input.frequency,
      interval: input.interval,
      startDate,
      nextIssueDate,
      endDate,
      maxOccurrences: input.maxOccurrences ?? null,
      dueDaysAfterIssue: input.dueDaysAfterIssue,
      autoSend: input.autoSend,
      currency: input.currency.toUpperCase(),
      taxRate: input.taxRate,
      discount: input.discount,
      notes: input.notes?.trim() || null,
      templateId,
      sourceInvoiceId: input.sourceInvoiceId ?? null,
      items: { create: mapLineItemCreates(input.lineItems) },
    },
    include: listInclude,
  });
}

export async function createRecurringFromInvoice(
  companyId: string,
  memberId: string,
  invoiceId: string,
  input: CreateRecurringFromInvoiceInput,
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      client: true,
      items: { orderBy: [{ sectionSortOrder: "asc" }, { sortOrder: "asc" }] },
    },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (!invoice.clientId || !invoice.client) {
    throw new Error("Invoice must have a client to become recurring");
  }
  if (invoice.items.length === 0) {
    throw new Error("Invoice must have at least one line item");
  }

  const dueDays =
    input.dueDaysAfterIssue ??
    (invoice.dueDate && invoice.issueDate
      ? Math.max(
          0,
          Math.round(
            (startOfUtcDay(invoice.dueDate).getTime() -
              startOfUtcDay(invoice.issueDate).getTime()) /
              86_400_000,
          ),
        )
      : 14);

  const name =
    input.name?.trim() ||
    `${frequencyLabel(input.frequency, input.interval)} – ${invoice.client.name}`;

  return createRecurringInvoice(companyId, memberId, {
    name,
    clientId: invoice.clientId,
    frequency: input.frequency,
    interval: input.interval,
    startDate: input.startDate,
    nextIssueDate: input.nextIssueDate ?? input.startDate,
    endDate: input.endDate ?? null,
    maxOccurrences: input.maxOccurrences ?? null,
    dueDaysAfterIssue: dueDays,
    autoSend: input.autoSend,
    currency: invoice.currency,
    taxRate: Number(invoice.taxRate),
    discount: Number(invoice.discount),
    notes: invoice.notes,
    templateId: invoice.templateId,
    sourceInvoiceId: invoice.id,
    lineItems: invoice.items.map((item, index) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      sortOrder: item.sortOrder ?? index,
      sectionTitle: item.sectionTitle,
      sectionSortOrder: item.sectionSortOrder ?? 0,
    })),
  });
}

export async function updateRecurringInvoice(
  companyId: string,
  id: string,
  input: UpdateRecurringInvoiceInput,
) {
  const existing = await getRecurringInvoice(id, companyId);
  if (!existing) return null;

  if (input.clientId) {
    const client = await assertClient(companyId, input.clientId);
    if (!client) throw new Error("Client not found");
  }

  let templateId: string | null | undefined = undefined;
  if (input.templateId !== undefined) {
    templateId = input.templateId
      ? await resolveTemplateId(companyId, input.templateId)
      : null;
  }

  return prisma.$transaction(async (tx) => {
    if (input.lineItems) {
      await tx.recurringInvoiceLineItem.deleteMany({ where: { recurringInvoiceId: id } });
      await tx.recurringInvoiceLineItem.createMany({
        data: mapLineItemCreates(input.lineItems).map((item) => ({
          ...item,
          recurringInvoiceId: id,
        })),
      });
    }

    return tx.recurringInvoice.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
        ...(input.interval !== undefined ? { interval: input.interval } : {}),
        ...(input.startDate !== undefined
          ? { startDate: parseUtcDateOnly(input.startDate) }
          : {}),
        ...(input.nextIssueDate !== undefined
          ? { nextIssueDate: parseUtcDateOnly(input.nextIssueDate) }
          : {}),
        ...(input.endDate !== undefined
          ? { endDate: input.endDate ? parseUtcDateOnly(input.endDate) : null }
          : {}),
        ...(input.maxOccurrences !== undefined
          ? { maxOccurrences: input.maxOccurrences }
          : {}),
        ...(input.dueDaysAfterIssue !== undefined
          ? { dueDaysAfterIssue: input.dueDaysAfterIssue }
          : {}),
        ...(input.autoSend !== undefined ? { autoSend: input.autoSend } : {}),
        ...(input.currency !== undefined
          ? { currency: input.currency.toUpperCase() }
          : {}),
        ...(input.taxRate !== undefined ? { taxRate: input.taxRate } : {}),
        ...(input.discount !== undefined ? { discount: input.discount } : {}),
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
        ...(templateId !== undefined ? { templateId } : {}),
      },
      include: listInclude,
    });
  });
}

export async function setRecurringInvoiceStatus(
  companyId: string,
  id: string,
  status: RecurringInvoiceStatus,
) {
  const existing = await getRecurringInvoice(id, companyId);
  if (!existing) return null;

  if (status === "ACTIVE" && existing.status === "ENDED") {
    // Resuming an ended schedule requires a future next date; keep nextIssueDate as-is.
  }

  return prisma.recurringInvoice.update({
    where: { id },
    data: {
      status,
      lastError: status === "ACTIVE" ? null : existing.lastError,
    },
    include: listInclude,
  });
}

export async function deleteRecurringInvoice(companyId: string, id: string) {
  const existing = await getRecurringInvoice(id, companyId);
  if (!existing) return null;
  await prisma.recurringInvoice.delete({ where: { id } });
  return existing;
}

async function sendGeneratedInvoice(
  invoiceId: string,
  companyId: string,
  memberId: string | null,
) {
  const result = await generateInvoicePdfBuffer(invoiceId, companyId);
  if (!result) throw new Error("Generated invoice not found");

  const { invoice, pdfBuffer } = result;
  const recipientEmail = invoice.client?.email;
  if (!recipientEmail) {
    throw new Error("Client email is required for auto-send");
  }

  await sendInvoiceEmail({
    to: recipientEmail,
    companyName: invoice.company.name,
    invoiceNumber: invoice.number,
    total: formatMoney(invoice.total, invoice.currency),
    pdfBuffer,
    viewUrl: publicDocumentUrl(
      await getAppOrigin(),
      "invoice",
      (await ensureInvoicePublicToken(invoiceId, companyId))!,
    ),
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
      sentAt: invoice.sentAt ?? new Date(),
    },
  });

  await recordDocumentRevision({
    companyId,
    documentType: "INVOICE",
    documentId: invoiceId,
    memberId: memberId ?? undefined,
    source: "SEND",
    summary: `Auto-sent from recurring schedule to ${recipientEmail}`,
    metadata: { email: recipientEmail, recurring: true },
  });
}

export type IssueRecurringResult = {
  recurringInvoiceId: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  skipped: boolean;
  ended: boolean;
  autoSent: boolean;
  error?: string;
};

/**
 * Issue one occurrence for a schedule (used by cron and manual "Generate now").
 * Idempotent for the same nextIssueDate calendar day.
 */
export async function issueRecurringInvoiceOccurrence(
  companyId: string,
  recurringInvoiceId: string,
  options?: { memberId?: string | null; force?: boolean },
): Promise<IssueRecurringResult> {
  const today = startOfUtcDay(new Date());

  const schedule = await prisma.recurringInvoice.findFirst({
    where: { id: recurringInvoiceId, companyId },
    include: {
      client: true,
      items: { orderBy: [{ sectionSortOrder: "asc" }, { sortOrder: "asc" }] },
    },
  });

  if (!schedule) {
    return {
      recurringInvoiceId,
      invoiceId: null,
      invoiceNumber: null,
      skipped: true,
      ended: false,
      autoSent: false,
      error: "Not found",
    };
  }

  if (schedule.status !== "ACTIVE" && !options?.force) {
    return {
      recurringInvoiceId,
      invoiceId: null,
      invoiceNumber: null,
      skipped: true,
      ended: schedule.status === "ENDED",
      autoSent: false,
      error: `Schedule is ${schedule.status.toLowerCase()}`,
    };
  }

  const issueDate = startOfUtcDay(schedule.nextIssueDate);
  if (!options?.force && issueDate.getTime() > today.getTime()) {
    return {
      recurringInvoiceId,
      invoiceId: null,
      invoiceNumber: null,
      skipped: true,
      ended: false,
      autoSent: false,
      error: "Not due yet",
    };
  }

  if (schedule.items.length === 0) {
    await prisma.recurringInvoice.update({
      where: { id: schedule.id },
      data: { lastError: "No line items on schedule" },
    });
    return {
      recurringInvoiceId,
      invoiceId: null,
      invoiceNumber: null,
      skipped: true,
      ended: false,
      autoSent: false,
      error: "No line items on schedule",
    };
  }

  const dayStart = issueDate;
  const dayEnd = new Date(issueDate.getTime() + 86_400_000);
  const alreadyIssued = await prisma.invoice.findFirst({
    where: {
      recurringInvoiceId: schedule.id,
      issueDate: { gte: dayStart, lt: dayEnd },
    },
    select: { id: true, number: true },
  });

  if (alreadyIssued) {
    // Recover a stuck schedule: advance past this date.
    const next = advanceIssueDate(issueDate, schedule.frequency, schedule.interval);
    const occurrenceCount = schedule.occurrenceCount;
    const ended = shouldEndSchedule({
      nextIssueDate: next,
      endDate: schedule.endDate,
      maxOccurrences: schedule.maxOccurrences,
      occurrenceCount,
    });
    await prisma.recurringInvoice.update({
      where: { id: schedule.id },
      data: {
        nextIssueDate: next,
        status: ended ? "ENDED" : schedule.status,
        lastError: null,
      },
    });
    return {
      recurringInvoiceId,
      invoiceId: alreadyIssued.id,
      invoiceNumber: alreadyIssued.number,
      skipped: true,
      ended,
      autoSent: false,
    };
  }

  const { lineItems, totals } = buildInvoiceTotals({
    lineItems: schedule.items.map((item, index) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      sortOrder: item.sortOrder ?? index,
      sectionTitle: item.sectionTitle,
      sectionSortOrder: item.sectionSortOrder ?? 0,
    })),
    taxRate: Number(schedule.taxRate),
    discount: Number(schedule.discount),
  });

  const dueDate = new Date(
    issueDate.getTime() + schedule.dueDaysAfterIssue * 86_400_000,
  );

  let createdInvoiceId: string | null = null;
  let createdNumber: string | null = null;
  let ended = false;

  try {
    const invoiceNumber = await generateNextInvoiceNumber(companyId);

    const created = await prisma.$transaction(async (tx) => {
      // Re-check claim inside the transaction.
      const fresh = await tx.recurringInvoice.findFirst({
        where: { id: schedule.id, companyId },
      });
      if (!fresh) throw new Error("Schedule disappeared");
      if (
        formatUtcDateOnly(startOfUtcDay(fresh.nextIssueDate)) !==
        formatUtcDateOnly(issueDate)
      ) {
        throw new Error("Schedule already advanced");
      }

      const duplicate = await tx.invoice.findFirst({
        where: {
          recurringInvoiceId: schedule.id,
          issueDate: { gte: dayStart, lt: dayEnd },
        },
        select: { id: true, number: true },
      });
      if (duplicate) {
        return { invoice: duplicate, duplicate: true as const };
      }

      const invoice = await tx.invoice.create({
        data: {
          companyId,
          clientId: schedule.clientId,
          templateId: schedule.templateId,
          recurringInvoiceId: schedule.id,
          number: invoiceNumber,
          status: "DRAFT",
          currency: schedule.currency,
          subtotal: totals.subtotal,
          taxRate: Number(schedule.taxRate),
          taxAmount: totals.taxAmount,
          discount: Number(schedule.discount),
          total: totals.total,
          notes: schedule.notes,
          issueDate,
          dueDate,
          items: { create: lineItems },
        },
        select: { id: true, number: true },
      });

      const nextOccurrenceCount = fresh.occurrenceCount + 1;
      const nextIssueDate = advanceIssueDate(
        issueDate,
        fresh.frequency,
        fresh.interval,
      );
      ended = shouldEndSchedule({
        nextIssueDate,
        endDate: fresh.endDate,
        maxOccurrences: fresh.maxOccurrences,
        occurrenceCount: nextOccurrenceCount,
      });

      await tx.recurringInvoice.update({
        where: { id: schedule.id },
        data: {
          occurrenceCount: nextOccurrenceCount,
          nextIssueDate,
          lastIssuedAt: new Date(),
          lastError: null,
          status: ended ? "ENDED" : fresh.status === "PAUSED" ? "PAUSED" : "ACTIVE",
        },
      });

      return { invoice, duplicate: false as const };
    });

    createdInvoiceId = created.invoice.id;
    createdNumber = created.invoice.number;

    if (!created.duplicate) {
      const snapshot = await loadInvoiceSnapshot(companyId, created.invoice.id);
      if (snapshot) {
        await recordDocumentRevision({
          companyId,
          documentType: "INVOICE",
          documentId: created.invoice.id,
          memberId: options?.memberId ?? schedule.memberId ?? undefined,
          source: "CREATE",
          snapshot,
          summary: `Issued from recurring schedule “${schedule.name}”`,
          metadata: { recurringInvoiceId: schedule.id },
        });
      }
    }

    let autoSent = false;
    if (!created.duplicate && schedule.autoSend) {
      try {
        await sendGeneratedInvoice(
          created.invoice.id,
          companyId,
          options?.memberId ?? schedule.memberId,
        );
        autoSent = true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Auto-send failed";
        await prisma.recurringInvoice.update({
          where: { id: schedule.id },
          data: { lastError: message },
        });
        return {
          recurringInvoiceId,
          invoiceId: created.invoice.id,
          invoiceNumber: created.invoice.number,
          skipped: false,
          ended,
          autoSent: false,
          error: message,
        };
      }
    }

    return {
      recurringInvoiceId,
      invoiceId: createdInvoiceId,
      invoiceNumber: createdNumber,
      skipped: created.duplicate,
      ended,
      autoSent,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to issue invoice";
    if (message === "Schedule already advanced") {
      return {
        recurringInvoiceId,
        invoiceId: null,
        invoiceNumber: null,
        skipped: true,
        ended: false,
        autoSent: false,
      };
    }
    await prisma.recurringInvoice.update({
      where: { id: schedule.id },
      data: { lastError: message },
    });
    return {
      recurringInvoiceId,
      invoiceId: createdInvoiceId,
      invoiceNumber: createdNumber,
      skipped: false,
      ended: false,
      autoSent: false,
      error: message,
    };
  }
}

/** Cron: issue all ACTIVE schedules that are due on or before today (UTC). */
export async function runRecurringInvoiceJob(options?: { limit?: number }) {
  const today = startOfUtcDay(new Date());
  const due = await prisma.recurringInvoice.findMany({
    where: {
      status: "ACTIVE",
      nextIssueDate: { lte: today },
    },
    select: { id: true, companyId: true },
    orderBy: { nextIssueDate: "asc" },
    take: options?.limit ?? 200,
  });

  const results: IssueRecurringResult[] = [];
  for (const row of due) {
    results.push(await issueRecurringInvoiceOccurrence(row.companyId, row.id));
  }

  return {
    checked: due.length,
    issued: results.filter((r) => r.invoiceId && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    ended: results.filter((r) => r.ended).length,
    errors: results.filter((r) => r.error).map((r) => ({
      recurringInvoiceId: r.recurringInvoiceId,
      error: r.error,
    })),
    results,
  };
}
