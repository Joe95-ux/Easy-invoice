import { z } from "zod";

export const timeGroupModeSchema = z.enum(["per_entry", "per_day", "per_task"]);

export type TimeGroupMode = z.infer<typeof timeGroupModeSchema>;

export const timeEntrySchema = z.object({
  clientId: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  hours: z.number().positive("Hours must be greater than zero").max(24 * 7),
  hourlyRate: z.number().nonnegative(),
  billable: z.boolean().default(true),
});

export const updateTimeEntrySchema = timeEntrySchema.partial();

export type TimeEntryInput = z.infer<typeof timeEntrySchema>;

export const previewTimeInvoiceSchema = z.object({
  clientId: z.string().min(1),
  entryIds: z.array(z.string()).min(1),
  groupBy: timeGroupModeSchema.default("per_task"),
});

export const timeImportSchema = z.object({
  provider: z.enum(["toggl", "clockify"]),
  apiKey: z.string().min(8, "API key is required"),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  clientId: z.string().optional().nullable(),
  matchClientsByProject: z.boolean().default(true),
  fallbackHourlyRate: z.number().nonnegative().optional(),
});

export type TimeImportInput = z.infer<typeof timeImportSchema>;
