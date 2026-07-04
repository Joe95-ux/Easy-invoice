import type { NotificationType } from "@easy-invoice/db";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  CLIENT_VIEWED_INVOICE: "Invoice viewed",
  CLIENT_VIEWED_ESTIMATE: "Estimate viewed",
  ESTIMATE_ACCEPTED: "Estimate accepted",
  ESTIMATE_DECLINED: "Estimate declined",
  PAYMENT_RECEIVED: "Payment received",
  INVOICE_OVERDUE: "Invoice overdue",
  TEAM_INVITE_RECEIVED: "Team invite",
  MEMBER_ROLE_CHANGED: "Role changed",
};

export const NOTIFICATION_TYPE_VARIANT: Record<
  NotificationType,
  "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline"
> = {
  CLIENT_VIEWED_INVOICE: "info",
  CLIENT_VIEWED_ESTIMATE: "info",
  ESTIMATE_ACCEPTED: "success",
  ESTIMATE_DECLINED: "destructive",
  PAYMENT_RECEIVED: "success",
  INVOICE_OVERDUE: "warning",
  TEAM_INVITE_RECEIVED: "default",
  MEMBER_ROLE_CHANGED: "outline",
};
