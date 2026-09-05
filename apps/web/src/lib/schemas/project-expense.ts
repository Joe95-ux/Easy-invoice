import { z } from "zod";

export const createProjectExpenseSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(500),
  date: z.string().min(1, "Date is required"),
  amount: z.number().positive("Amount must be greater than zero").max(1_000_000_000),
  billable: z.boolean().default(false),
});

export const updateProjectExpenseSchema = createProjectExpenseSchema.partial();

export type CreateProjectExpenseInput = z.infer<typeof createProjectExpenseSchema>;
export type UpdateProjectExpenseInput = z.infer<typeof updateProjectExpenseSchema>;
