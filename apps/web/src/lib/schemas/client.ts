import { z } from "zod";

const optionalHourlyRate = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  },
  z.number().nonnegative().nullable().optional(),
);

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().min(2).default("US"),
  notes: z.string().optional(),
  defaultHourlyRate: optionalHourlyRate,
});

export const clientArchiveSchema = z.object({
  archived: z.boolean(),
});

export type ClientArchiveFilter = "active" | "archived" | "all";

export function clientArchiveWhere(archived: ClientArchiveFilter) {
  if (archived === "active") return { archivedAt: null };
  if (archived === "archived") return { archivedAt: { not: null } };
  return {};
}

export type ClientInput = z.infer<typeof clientSchema>;
