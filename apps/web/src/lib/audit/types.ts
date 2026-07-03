import { AuditAction, AuditCategory } from "@/lib/db";

export type AuditActorMetadata = {
  actorName?: string | null;
  actorEmail?: string | null;
};

export type RecordAuditEventInput = {
  companyId: string;
  memberId?: string | null;
  category: AuditCategory;
  action: AuditAction;
  summary: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AuditEventListItem = {
  id: string;
  category: AuditCategory;
  action: AuditAction;
  summary: string;
  entityType: string | null;
  entityId: string | null;
  metadata: AuditActorMetadata & Record<string, unknown>;
  createdAt: string;
  actorLabel: string;
};
