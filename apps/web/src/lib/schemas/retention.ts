import { z } from "zod";

export const retentionSegmentSchema = z.enum([
  "PAID_CLIENTS",
  "INACTIVE_60",
  "OPEN_ESTIMATES",
  "ALL_REACHABLE",
]);

export const createRetentionCampaignSchema = z.object({
  segment: retentionSegmentSchema,
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(4000),
  name: z.string().trim().max(120).optional(),
});

export type CreateRetentionCampaignInput = z.infer<typeof createRetentionCampaignSchema>;
