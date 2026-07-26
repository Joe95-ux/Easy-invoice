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
  paymentReceiptEmailsEnabled: z.boolean(),
  estimateRemindersEnabled: z.boolean(),
  estimateReminderDaysBefore: daysArraySchema,
  estimateReminderOnExpiryDay: z.boolean(),
  estimateReminderIncludePdf: z.boolean(),
});

export type ReminderSettingsInput = z.infer<typeof reminderSettingsSchema>;

export const invoiceRemindersPausedSchema = z.object({
  remindersPaused: z.boolean(),
});

export const estimateRemindersPausedSchema = z.object({
  remindersPaused: z.boolean(),
});
