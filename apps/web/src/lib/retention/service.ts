import type {
  RetentionCampaignStatus,
  RetentionSegment,
  RetentionSendStatus,
} from "@easy-invoice/db";
import { prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";
import {
  assertProFeature,
  PlanLimitError,
} from "@/lib/billing/entitlements";
import { isEmailConfigured, sendRetentionEmail } from "@/lib/email";
import { listRetentionAudience } from "@/lib/retention/segments";
import { retentionUnsubscribeToken } from "@/lib/retention/unsubscribe";

export const RETENTION_MAX_RECIPIENTS = 200;

const SEND_STATUS_RANK: Record<RetentionSendStatus, number> = {
  FAILED: 0,
  QUEUED: 1,
  SKIPPED: 2,
  SENT: 3,
};

/** Emails per background batch. Kept small so one invocation stays inside a function timeout. */
export const RETENTION_SEND_BATCH = 8;

type RetentionSendRecord = {
  id: string;
  email: string;
  status: RetentionSendStatus;
  error: string | null;
  sentAt: Date;
  client: { id: string; name: string };
};

type RetentionCampaignRecord = {
  id: string;
  name: string | null;
  subject: string;
  message: string;
  segment: RetentionSegment;
  status: RetentionCampaignStatus;
  sentAt: Date | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  member: { id: string; name: string | null; email: string } | null;
  /** Present only when recipient rows were loaded. */
  sends?: RetentionSendRecord[];
};

const campaignMemberSelect = {
  id: true,
  name: true,
  email: true,
} as const;

export function personalizeRetentionMessage(
  template: string,
  vars: { name: string; company: string },
): string {
  return template
    .replaceAll("{{name}}", vars.name)
    .replaceAll("{{company}}", vars.company);
}

export function serializeRetentionCampaign(campaign: RetentionCampaignRecord) {
  const sends = [...(campaign.sends ?? [])].sort((a, b) => {
    const rank = SEND_STATUS_RANK[a.status] - SEND_STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    return b.sentAt.getTime() - a.sentAt.getTime();
  });

  return {
    id: campaign.id,
    name: campaign.name,
    subject: campaign.subject,
    message: campaign.message,
    segment: campaign.segment,
    status: campaign.status,
    sentAt: campaign.sentAt?.toISOString() ?? null,
    recipientCount: campaign.recipientCount,
    sentCount: campaign.sentCount,
    failedCount: campaign.failedCount,
    createdAt: campaign.createdAt.toISOString(),
    member: campaign.member
      ? { id: campaign.member.id, name: campaign.member.name, email: campaign.member.email }
      : null,
    recipientsLoaded: campaign.sends != null,
    sends: sends.map((send) => ({
      id: send.id,
      email: send.email,
      status: send.status,
      error: send.error,
      sentAt: send.sentAt.toISOString(),
      client: { id: send.client.id, name: send.client.name },
    })),
  };
}

export type SerializedRetentionCampaign = ReturnType<typeof serializeRetentionCampaign>;

export async function getRetentionCampaigns(companyId: string) {
  return prisma.retentionCampaign.findMany({
    where: { companyId },
    include: {
      member: { select: campaignMemberSelect },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getRetentionCampaign(companyId: string, campaignId: string) {
  return prisma.retentionCampaign.findFirst({
    where: { id: campaignId, companyId },
    include: {
      member: { select: campaignMemberSelect },
      sends: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function sendRetentionCampaign(input: {
  companyId: string;
  memberId: string;
  plan: string | null | undefined;
  segment: RetentionSegment;
  subject: string;
  message: string;
  name?: string;
}) {
  assertProFeature(input.plan, "email_invoices");

  if (!isEmailConfigured()) {
    throw new Error("Email is not configured. Set RESEND_API_KEY to send outreach.");
  }

  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    select: { id: true },
  });
  if (!company) throw new Error("Company not found");

  const audience = await listRetentionAudience(input.companyId, input.segment);
  if (audience.length === 0) {
    throw new Error("No reachable clients in this segment");
  }
  if (audience.length > RETENTION_MAX_RECIPIENTS) {
    throw new PlanLimitError(
      `This segment has ${audience.length} people. Each send is limited to ${RETENTION_MAX_RECIPIENTS}. Choose a smaller segment and try again.`,
    );
  }

  const campaign = await prisma.retentionCampaign.create({
    data: {
      companyId: input.companyId,
      memberId: input.memberId,
      name: input.name?.trim() || null,
      subject: input.subject.trim(),
      message: input.message.trim(),
      segment: input.segment,
      status: "SENDING",
      recipientCount: audience.length,
      sends: {
        create: audience.map((client) => ({
          clientId: client.id,
          email: client.email,
          status: "QUEUED" as const,
        })),
      },
    },
    include: {
      member: { select: campaignMemberSelect },
      sends: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });

  return campaign;
}

export type RetentionBatchResult = {
  done: boolean;
  busy: boolean;
  processed: number;
};

function isTransactionBusy(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2028"
  );
}

async function finishRetentionCampaign(
  tx: Pick<typeof prisma, "retentionCampaignSend" | "retentionCampaign">,
  campaignId: string,
) {
  const [sentCount, failedCount] = await Promise.all([
    tx.retentionCampaignSend.count({ where: { campaignId, status: "SENT" } }),
    tx.retentionCampaignSend.count({ where: { campaignId, status: "FAILED" } }),
  ]);
  await tx.retentionCampaign.update({
    where: { id: campaignId },
    data: {
      status: sentCount > 0 ? "SENT" : "FAILED",
      sentAt: new Date(),
      sentCount,
      failedCount,
    },
  });
}

/** Send the next handful of queued recipients. Safe to run more than once. */
export async function processRetentionBatch(
  campaignId: string,
  originInput?: string,
): Promise<RetentionBatchResult> {
  const configured = originInput ?? process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  let origin = configured?.replace(/\/$/, "") ?? "";
  if (!origin) {
    try {
      origin = await getAppOrigin();
    } catch {
      throw new Error("APP_URL is required to send retention email");
    }
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`retention:${campaignId}`}, 0))`;

        const campaign = await tx.retentionCampaign.findUnique({
          where: { id: campaignId },
          include: { company: { select: { id: true, name: true, email: true } } },
        });
        if (!campaign || campaign.status !== "SENDING") {
          return { done: true, busy: false, processed: 0 };
        }

        const queued = await tx.retentionCampaignSend.findMany({
          where: { campaignId, status: "QUEUED" },
          orderBy: { id: "asc" },
          take: RETENTION_SEND_BATCH,
          include: { client: { select: { id: true, name: true, marketingOptIn: true } } },
        });

        if (queued.length === 0) {
          await finishRetentionCampaign(tx, campaignId);
          return { done: true, busy: false, processed: 0 };
        }

        for (const row of queued) {
          if (!row.client.marketingOptIn) {
            await tx.retentionCampaignSend.update({
              where: { id: row.id },
              data: { status: "SKIPPED", error: null },
            });
            continue;
          }

          const token = retentionUnsubscribeToken(row.clientId, campaign.companyId);
          const unsubscribeUrl = `${origin}/unsubscribe/${token}`;
          const listUnsubscribeUrl = `${origin}/api/public/unsubscribe?token=${encodeURIComponent(token)}`;
          try {
            await sendRetentionEmail({
              to: row.email,
              companyName: campaign.company.name,
              subject: personalizeRetentionMessage(campaign.subject, {
                name: row.client.name,
                company: campaign.company.name,
              }),
              message: personalizeRetentionMessage(campaign.message, {
                name: row.client.name,
                company: campaign.company.name,
              }),
              unsubscribeUrl,
              listUnsubscribeUrl,
              replyTo: campaign.company.email,
            });
            await tx.retentionCampaignSend.update({
              where: { id: row.id },
              data: { status: "SENT", sentAt: new Date(), error: null },
            });
          } catch (error) {
            await tx.retentionCampaignSend.update({
              where: { id: row.id },
              data: {
                status: "FAILED",
                sentAt: new Date(),
                error: error instanceof Error ? error.message : "Send failed",
              },
            });
          }
        }

        const remaining = await tx.retentionCampaignSend.count({
          where: { campaignId, status: "QUEUED" },
        });
        const [sentCount, failedCount] = await Promise.all([
          tx.retentionCampaignSend.count({ where: { campaignId, status: "SENT" } }),
          tx.retentionCampaignSend.count({ where: { campaignId, status: "FAILED" } }),
        ]);

        if (remaining === 0) {
          await tx.retentionCampaign.update({
            where: { id: campaignId },
            data: {
              status: sentCount > 0 ? "SENT" : "FAILED",
              sentAt: new Date(),
              sentCount,
              failedCount,
            },
          });
          return { done: true, busy: false, processed: queued.length };
        }

        await tx.retentionCampaign.update({
          where: { id: campaignId },
          data: { sentCount, failedCount },
        });
        return { done: false, busy: false, processed: queued.length };
      },
      { maxWait: 10_000, timeout: 55_000 },
    );
  } catch (error) {
    if (isTransactionBusy(error)) return { done: false, busy: true, processed: 0 };
    throw error;
  }
}

export async function listSendingRetentionCampaignIds(): Promise<string[]> {
  const rows = await prisma.retentionCampaign.findMany({
    where: { status: "SENDING" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  return rows.map((row) => row.id);
}

export async function optOutClientMarketing(clientId: string, companyId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId },
    select: { id: true, name: true, marketingOptIn: true },
  });
  if (!client) return null;

  if (!client.marketingOptIn) {
    return { client, alreadyOptedOut: true as const };
  }

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: {
      marketingOptIn: false,
      marketingOptOutAt: new Date(),
    },
    select: { id: true, name: true, marketingOptIn: true },
  });

  return { client: updated, alreadyOptedOut: false as const };
}
