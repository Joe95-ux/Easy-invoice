import { z } from "zod";

const assignableRoleSchema = z.enum(["ADMIN", "MEMBER", "VIEWER"]);

export const inviteMemberSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: assignableRoleSchema.default("MEMBER"),
});

export const updateMemberRoleSchema = z.object({
  role: assignableRoleSchema,
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
