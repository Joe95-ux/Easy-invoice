import type { AuditCategory } from "@easy-invoice/db";
import type { AuditEventListItem } from "./types";
import { AUDIT_ACTION_LABELS, AUDIT_CATEGORY_LABELS } from "./labels";
import { formatDateTime } from "@/lib/invoices";

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function actorEmailFromMetadata(metadata: Record<string, unknown>): string {
  return typeof metadata.actorEmail === "string" ? metadata.actorEmail : "";
}

export function buildAuditEventsCsv(events: AuditEventListItem[]): string {
  const header = [
    "Timestamp",
    "Category",
    "Action",
    "Summary",
    "Actor",
    "Actor email",
    "Entity type",
    "Entity ID",
  ];

  const rows = events.map((event) => [
    formatDateTime(event.createdAt),
    AUDIT_CATEGORY_LABELS[event.category as AuditCategory],
    AUDIT_ACTION_LABELS[event.action],
    event.summary,
    event.actorLabel,
    actorEmailFromMetadata(event.metadata),
    event.entityType ?? "",
    event.entityId ?? "",
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\n");
}
