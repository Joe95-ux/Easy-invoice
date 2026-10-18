import { AuditAction, AuditCategory, prisma } from "@/lib/db";
import { renderInvoicePdf } from "@/lib/ai-docs";
import { recordAuditEvent } from "@/lib/audit/service";
import { getAppOrigin } from "@/lib/app-url";
import { assertProFeature } from "@/lib/billing/entitlements";
import { allocateStatementNumber } from "@/lib/document-numbers";
import { generatePublicToken, publicDocumentUrl } from "@/lib/document-tokens";
import { getEmailFromAddress } from "@/lib/email";
import { formatMoney } from "@/lib/invoices";
import {
  buildInvoicePaymentSummary,
  invoiceSettlementInclude,
} from "@/lib/invoice-payments-utils";
import { daysUntilDue, startOfUtcDay } from "@/lib/reminders/dates";
import { renderStatementHtml, type StatementHtmlData, type StatementInvoiceRow } from "@/lib/statement-html";
import { Resend } from "resend";

const OPEN_STATUSES = ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"] as const;

type StatementSnapshot = {
  currency: string;
  totalDue: number;
  current: number;
  days1to30: number;
  days31to60: number;
  days61plus: number;
  invoices: StatementInvoiceRow[];
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function buildClientStatementSnapshot(
  clientId: string,
  companyId: string,
  today = new Date(),
): Promise<StatementSnapshot | null> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId },
    include: {
      company: { select: { currency: true, plan: true } },
      invoices: {
        where: { status: { in: [...OPEN_STATUSES] } },
        include: invoiceSettlementInclude,
        orderBy: { dueDate: "asc" },
      },
    },
  });
  if (!client) return null;
  assertProFeature(client.company.plan, "client_statements");

  const day = startOfUtcDay(today);
  const rows: StatementInvoiceRow[] = [];
  let current = 0;
  let days1to30 = 0;
  let days31to60 = 0;
  let days61plus = 0;

  for (const invoice of client.invoices) {
    const summary = buildInvoicePaymentSummary(invoice, day);
    if (summary.balanceDue <= 0.001) continue;
    const due = summary.nextDueDate ?? invoice.dueDate;
    const until = due ? daysUntilDue(day, due) : null;
    const pastDue = until != null && until < 0 ? Math.abs(until) : null;
    rows.push({
      number: invoice.number,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: due ? due.toISOString() : null,
      status: invoice.status,
      total: Number(invoice.total),
      credits: summary.amountCredited,
      lateFees: summary.amountLateFees,
      paid: summary.amountPaid,
      balanceDue: summary.balanceDue,
      daysPastDue: pastDue,
    });
    if (pastDue == null || pastDue <= 0) current += summary.balanceDue;
    else if (pastDue <= 30) days1to30 += summary.balanceDue;
    else if (pastDue <= 60) days31to60 += summary.balanceDue;
    else days61plus += summary.balanceDue;
  }

  return {
    currency: client.invoices[0]?.currency ?? client.company.currency,
    totalDue: roundMoney(current + days1to30 + days31to60 + days61plus),
    current: roundMoney(current),
    days1to30: roundMoney(days1to30),
    days31to60: roundMoney(days31to60),
    days61plus: roundMoney(days61plus),
    invoices: rows,
  };
}

async function statementHtmlData(
  statement: {
    number: string;
    issuedAt: Date;
    currency: string;
    totalDue: { toString(): string } | number;
    snapshot: unknown;
  },
  company: StatementHtmlData["company"],
  client: StatementHtmlData["client"],
  viewUrl?: string,
): Promise<StatementHtmlData> {
  const snapshot = statement.snapshot as StatementSnapshot;
  return {
    company,
    client,
    statement: {
      number: statement.number,
      issuedAt: statement.issuedAt,
      currency: statement.currency,
      totalDue: Number(statement.totalDue),
      current: snapshot.current,
      days1to30: snapshot.days1to30,
      days31to60: snapshot.days31to60,
      days61plus: snapshot.days61plus,
    },
    invoices: snapshot.invoices,
    viewUrl,
  };
}

export async function createAndSendClientStatement(input: {
  clientId: string;
  companyId: string;
  memberId?: string | null;
  toEmail?: string | null;
}) {
  const client = await prisma.client.findFirst({
    where: { id: input.clientId, companyId: input.companyId },
    include: { company: true },
  });
  if (!client) throw new Error("Client not found");
  assertProFeature(client.company.plan, "client_statements");

  const snapshot = await buildClientStatementSnapshot(input.clientId, input.companyId);
  if (!snapshot) throw new Error("Client not found");
  if (snapshot.invoices.length === 0) {
    throw new Error("This client has no open invoices to include on a statement");
  }

  const number = await allocateStatementNumber(input.companyId);
  const toEmail = input.toEmail?.trim() || client.email;
  const created = await prisma.clientStatement.create({
    data: {
      companyId: input.companyId,
      clientId: client.id,
      memberId: input.memberId ?? null,
      number,
      currency: snapshot.currency,
      totalDue: snapshot.totalDue,
      publicToken: generatePublicToken(),
      toEmail: toEmail ?? null,
      snapshot,
    },
  });

  const origin = await getAppOrigin();
  const viewUrl = publicDocumentUrl(origin, "statement", created.publicToken!);
  const html = renderStatementHtml(
    await statementHtmlData(
      created,
      {
        name: client.company.name,
        logoUrl: client.company.logoUrl,
        email: client.company.email,
        phone: client.company.phone,
        address: client.company.address,
        city: client.company.city,
        state: client.company.state,
        zip: client.company.zip,
        country: client.company.country,
      },
      {
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        country: client.country,
      },
      viewUrl,
    ),
  );
  const pdfBuffer = await renderInvoicePdf(html);

  if (toEmail) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: getEmailFromAddress(),
      to: toEmail,
      ...(client.company.email?.includes("@") ? { replyTo: client.company.email } : {}),
      subject: `Account statement ${created.number} from ${client.company.name}`,
      html: `
        <p>Hello${client.name ? ` ${client.name}` : ""},</p>
        <p>Please find the current account statement from <strong>${client.company.name}</strong>.</p>
        <p>Amount due: <strong>${formatMoney(snapshot.totalDue, snapshot.currency)}</strong></p>
        <p><a href="${viewUrl}">View statement online</a></p>
        <p>If you have already sent payment, please disregard this message.</p>
        <p>— ${client.company.name}</p>
      `,
      attachments: [{ filename: `${created.number}.pdf`, content: pdfBuffer }],
    });
    if (error) throw new Error(error.message);
  }

  await recordAuditEvent({
    companyId: input.companyId,
    memberId: input.memberId ?? null,
    category: AuditCategory.DOCUMENT,
    action: AuditAction.STATEMENT_SENT,
    summary: `Sent statement ${created.number} to ${toEmail ?? client.name}`,
    entityType: "ClientStatement",
    entityId: created.id,
    metadata: { clientId: client.id, totalDue: snapshot.totalDue },
  });

  return { statement: created, pdfBuffer, viewUrl };
}

export async function getStatementForMember(id: string, companyId: string) {
  return prisma.clientStatement.findFirst({
    where: { id, companyId },
    include: { client: true, company: true },
  });
}

export async function getStatementByToken(token: string) {
  return prisma.clientStatement.findFirst({
    where: { publicToken: token },
    include: { client: true, company: true },
  });
}

export async function renderStatementPdfForRecord(statement: NonNullable<
  Awaited<ReturnType<typeof getStatementForMember>>
>) {
  const origin = await getAppOrigin();
  const viewUrl = statement.publicToken
    ? publicDocumentUrl(origin, "statement", statement.publicToken)
    : undefined;
  const html = renderStatementHtml(
    await statementHtmlData(statement, statement.company, statement.client, viewUrl),
  );
  return renderInvoicePdf(html);
}

export async function generateClientStatementPdfBuffer(clientId: string, companyId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId },
    include: { company: true },
  });
  if (!client) return null;
  const snapshot = await buildClientStatementSnapshot(clientId, companyId);
  if (!snapshot) return null;
  const html = renderStatementHtml({
    company: {
      name: client.company.name,
      logoUrl: client.company.logoUrl,
      email: client.company.email,
      phone: client.company.phone,
      address: client.company.address,
      city: client.company.city,
      state: client.company.state,
      zip: client.company.zip,
      country: client.company.country,
    },
    client: {
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      country: client.country,
    },
    statement: {
      number: "Current",
      issuedAt: new Date(),
      currency: snapshot.currency,
      totalDue: snapshot.totalDue,
      current: snapshot.current,
      days1to30: snapshot.days1to30,
      days31to60: snapshot.days31to60,
      days61plus: snapshot.days61plus,
    },
    invoices: snapshot.invoices,
  });
  return { pdfBuffer: await renderInvoicePdf(html), snapshot, client };
}
