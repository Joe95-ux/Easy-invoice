import { z } from "zod";

export const CONTACT_TOPICS = [
  { value: "billing", label: "Billing & plans" },
  { value: "invoices", label: "Invoices & estimates" },
  { value: "account", label: "Account & settings" },
  { value: "other", label: "Something else" },
] as const;

export const contactTopicValues = CONTACT_TOPICS.map((topic) => topic.value);

export const contactSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, "Please add a short subject")
    .max(200, "Subject is too long"),
  topic: z.enum(contactTopicValues as [string, ...string[]]),
  message: z
    .string()
    .trim()
    .min(10, "Please share a bit more detail (at least 10 characters)")
    .max(5000, "Message is too long"),
});

export type ContactInput = z.infer<typeof contactSchema>;
