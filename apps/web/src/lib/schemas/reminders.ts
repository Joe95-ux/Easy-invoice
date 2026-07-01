import { z } from "zod";

const daysArraySchema = z
  .array(z.number().int().min(1).max(90))
  .max(5)
  .transform((days) => [...new Set(days)].sort((a, b) => a - b));

export const reminderSettingsSchema = z.object({
  remindersEnabled: z.boolean(),
  reminderDaysBefore: daysArraySchema,
  reminderOnDueDate: z.boolean(),
  reminderDaysAfter: daysArraySchema,
  reminderIncludePdf: z.boolean(),
});

export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;

export const invoiceRemindersPausedSchema = z.object({
  remindersPaused: z.boolean(),
});
