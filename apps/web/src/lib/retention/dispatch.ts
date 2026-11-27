import { after } from "next/server";
import {
  listSendingRetentionCampaignIds,
  processRetentionBatch,
} from "@/lib/retention/service";

const BATCH_PATH = "/api/cron/retention-sends";

async function postRetentionBatch(campaignId: string) {
  const secret = process.env.CRON_SECRET?.trim();
  const origin = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL)?.replace(/\/$/, "");
  if (!secret || !origin) {
    console.error("[retention] batch not chained: set CRON_SECRET and APP_URL");
    return;
  }

  const response = await fetch(`${origin}${BATCH_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ campaignId }),
  });
  if (!response.ok) {
    console.error("[retention] batch request failed", response.status);
  }
}

/** Continue a queued send after the user's request has returned. */
export function scheduleRetentionBatch(campaignId: string, origin?: string) {
  after(async () => {
    try {
      if (process.env.NODE_ENV === "production") {
        await postRetentionBatch(campaignId);
        return;
      }

      for (let step = 0; step < 40; step += 1) {
        const result = await processRetentionBatch(campaignId, origin);
        if (result.done || result.busy) return;
      }
    } catch (error) {
      console.error("[retention] batch failed", campaignId, error);
    }
  });
}

/** Restart sends that are still queued. Used when the page opens and by the daily cron. */
export async function resumeRetentionSends(origin?: string) {
  const ids = await listSendingRetentionCampaignIds();
  for (const id of ids) scheduleRetentionBatch(id, origin);
  return ids.length;
}
