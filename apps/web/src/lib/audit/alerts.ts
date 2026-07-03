import { AuditAction, UserRole, prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-url";
import { isEmailConfigured, sendAuditAlertEmail } from "@/lib/email";
import { resolveMemberLoginEmails } from "@/lib/member-email";
import { AUDIT_ACTION_LABELS } from "./labels";

/** Actions that trigger email alerts to company admins and owners. */
const ALERT_ACTIONS = new Set<AuditAction>([
  AuditAction.MEMBER_INVITED,
  AuditAction.MEMBER_INVITE_CANCELLED,
  AuditAction.MEMBER_ROLE_CHANGED,
  AuditAction.MEMBER_REMOVED,
  AuditAction.COMPANY_PROFILE_UPDATED,
  AuditAction.COMPANY_LOGO_UPLOADED,
  AuditAction.COMPANY_LOGO_REMOVED,
  AuditAction.REMINDER_SETTINGS_UPDATED,
  AuditAction.DEFAULT_TEMPLATE_CHANGED,
  AuditAction.INVOICE_DELETED,
  AuditAction.ESTIMATE_DELETED,
  AuditAction.CLIENT_DELETED,
]);

type NotifyAuditAlertInput = {
  companyId: string;
  actorMemberId?: string | null;
  action: AuditAction;
  summary: string;
  actorName?: string | null;
  actorEmail?: string | null;
  createdAt: Date;
};

export function shouldSendAuditAlert(action: AuditAction): boolean {
  return ALERT_ACTIONS.has(action);
}

export async function notifyAuditAlert(input: NotifyAuditAlertInput) {
  if (!isEmailConfigured() || !shouldSendAuditAlert(input.action)) return;

  const [company, admins] = await Promise.all([
    prisma.company.findUnique({
      where: { id: input.companyId },
      select: { name: true },
    }),
    prisma.companyMember.findMany({
      where: {
        companyId: input.companyId,
        role: { in: [UserRole.OWNER, UserRole.ADMIN] },
      },
      select: { id: true, clerkId: true, email: true, name: true },
    }),
  ]);

  if (!company || admins.length === 0) return;

  const adminsWithEmails = await resolveMemberLoginEmails(admins);
  const actorEmail = input.actorEmail?.toLowerCase();

  const recipients = adminsWithEmails
    .filter((admin) => admin.id !== input.actorMemberId)
    .filter((admin) => admin.email.toLowerCase() !== actorEmail)
    .map((admin) => admin.email);

  if (recipients.length === 0) return;

  const origin = await getAppOrigin();
  const activityUrl = `${origin}/settings/activity`;
  const actorLabel = input.actorName?.trim() || input.actorEmail || "Someone";
  const actionLabel = AUDIT_ACTION_LABELS[input.action];

  await sendAuditAlertEmail({
    to: recipients,
    companyName: company.name,
    actionLabel,
    summary: input.summary,
    actorLabel,
    occurredAt: input.createdAt,
    activityUrl,
  });
}
