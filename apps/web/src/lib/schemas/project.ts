import { z } from "zod";

export const projectStatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]);

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  clientId: z.string().min(1).optional().nullable(),
  status: projectStatusSchema.optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  currency: z.string().length(3).optional(),
  budget: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  estimateId: z.string().min(1).optional().nullable(),
  invoiceId: z.string().min(1).optional().nullable(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: projectStatusSchema.optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
