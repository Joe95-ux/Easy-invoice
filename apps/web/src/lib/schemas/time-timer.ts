import { z } from "zod";

export const startTimeTimerSchema = z.object({
  clientId: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  billable: z.boolean().default(true),
  hourlyRate: z.number().nonnegative().optional(),
});

export const updateTimeTimerSchema = startTimeTimerSchema.partial();

export type StartTimeTimerInput = z.infer<typeof startTimeTimerSchema>;
export type UpdateTimeTimerInput = z.infer<typeof updateTimeTimerSchema>;
