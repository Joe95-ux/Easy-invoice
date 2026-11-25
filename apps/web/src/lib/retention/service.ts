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
  SKIPPED: 1,
  SENT: 2,
};

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
    select: { id: true, name: true, email: true },
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
    },
  });

  let sentCount = 0;
  let failedCount = 0;
  let fatal: unknown = null;

  try {
    const origin = await getAppOrigin();
    for (const client of audience) {
      const token = retentionUnsubscribeToken(client.id, input.companyId);
      const unsubscribeUrl = `${origin}/unsubscribe/${token}`;
      const listUnsubscribeUrl = `${origin}/api/public/unsubscribe?token=${encodeURIComponent(token)}`;
      const personalized = personalizeRetentionMessage(input.message, {
        name: client.name,
        company: company.name,
      });
      const personalizedSubject = personalizeRetentionMessage(input.subject, {
        name: client.name,
        company: company.name,
      });

      try {
        await sendRetentionEmail({
          to: client.email,
          companyName: company.name,
          subject: personalizedSubject,
          message: personalized,
          unsubscribeUrl,
          listUnsubscribeUrl,
          replyTo: company.email,
        });

        await prisma.retentionCampaignSend.create({
          data: {
            campaignId: campaign.id,
            clientId: client.id,
            email: client.email,
            status: "SENT",
          },
        });
        sentCount += 1;
      } catch (error) {
        failedCount += 1;
        await prisma.retentionCampaignSend.create({
          data: {
            campaignId: campaign.id,
            clientId: client.id,
            email: client.email,
            status: "FAILED",
            error: error instanceof Error ? error.message : "Send failed",
          },
        });
      }
    }
  } catch (error) {
    fatal = error;
  }

  const updated = await prisma.retentionCampaign.update({
    where: { id: campaign.id },
    data: {
      status: sentCount === 0 ? "FAILED" : "SENT",
      sentAt: new Date(),
      sentCount,
      failedCount,
    },
    include: {
      member: { select: campaignMemberSelect },
      sends: {
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });

  if (fatal && sentCount === 0 && failedCount === 0) {
    throw fatal instanceof Error ? fatal : new Error("Could not send outreach");
  }

  return updated;
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
