import type { NotificationType } from "@easy-invoice/db";

export type NotificationPreferences = {
  notifyClientViewed: boolean;
  notifyEstimateResponse: boolean;
  notifyPaymentReceived: boolean;
  notifyInvoiceOverdue: boolean;
  notifyTeamChanges: boolean;
};

export const NOTIFICATION_PREF_DEFAULTS: NotificationPreferences = {
  notifyClientViewed: true,
  notifyEstimateResponse: true,
  notifyPaymentReceived: true,
  notifyInvoiceOverdue: true,
  notifyTeamChanges: true,
};

export const NOTIFICATION_TYPE_TO_PREF: Record<NotificationType, keyof NotificationPreferences> = {
  CLIENT_VIEWED_INVOICE: "notifyClientViewed",
  CLIENT_VIEWED_ESTIMATE: "notifyClientViewed",
  ESTIMATE_ACCEPTED: "notifyEstimateResponse",
  ESTIMATE_DECLINED: "notifyEstimateResponse",
  PAYMENT_RECEIVED: "notifyPaymentReceived",
  INVOICE_OVERDUE: "notifyInvoiceOverdue",
  TEAM_INVITE_RECEIVED: "notifyTeamChanges",
  MEMBER_ROLE_CHANGED: "notifyTeamChanges",
};

export const NOTIFICATION_PREF_LABELS: Record<keyof NotificationPreferences, { title: string; description: string }> = {
  notifyClientViewed: {
    title: "Client viewed",
    description: "When a client views your invoice or estimate",
  },
  notifyEstimateResponse: {
    title: "Estimate response",
    description: "When a client accepts or declines an estimate",
  },
  notifyPaymentReceived: {
    title: "Payment received",
    description: "When a payment is recorded on an invoice",
  },
  notifyInvoiceOverdue: {
    title: "Invoice overdue",
    description: "When an invoice passes its due date without payment",
  },
  notifyTeamChanges: {
    title: "Team changes",
    description: "When you receive a team invite or your role changes",
  },
};

export type NotificationListItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
};
