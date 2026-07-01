import { z } from "zod";

export const feedbackSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, "Please share a bit more detail (at least 10 characters)")
    .max(5000, "Feedback is too long"),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
