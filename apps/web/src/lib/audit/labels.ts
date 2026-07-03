import { AuditAction, AuditCategory } from "@/lib/db";

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  TEAM: "Team",
  SETTINGS: "Settings",
  DOCUMENT: "Documents",
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  MEMBER_INVITED: "Member invited",
  MEMBER_INVITE_CANCELLED: "Invite cancelled",
  MEMBER_JOINED: "Member joined",
  MEMBER_ROLE_CHANGED: "Role changed",
  MEMBER_REMOVED: "Member removed",
  COMPANY_PROFILE_UPDATED: "Profile updated",
  COMPANY_LOGO_UPLOADED: "Logo uploaded",
  COMPANY_LOGO_REMOVED: "Logo removed",
  REMINDER_SETTINGS_UPDATED: "Reminder settings updated",
  DEFAULT_TEMPLATE_CHANGED: "Default template changed",
  INVOICE_DELETED: "Invoice deleted",
  ESTIMATE_DELETED: "Estimate deleted",
  CLIENT_DELETED: "Client deleted",
};
