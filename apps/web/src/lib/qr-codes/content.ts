import type {
  EventContent,
  QrCodeType,
  VcardContent,
} from "@/lib/qr-codes/types";

export const QR_TYPE_LABEL: Record<QrCodeType, string> = {
  LINK: "Website / Link",
  PDF: "PDF",
  VCARD: "Business card",
  EVENT: "Event",
};

export const QR_TYPE_DESCRIPTION: Record<QrCodeType, string> = {
  LINK: "Send scanners to any web address.",
  PDF: "Share a document that opens on any phone.",
  VCARD: "Save your business contact in one tap.",
  EVENT: "Add an event straight to a calendar.",
};

/** Short, human label describing where a code points — used in tables. */
export function qrDestinationSummary(
  type: QrCodeType,
  content: Record<string, unknown>,
): string {
  switch (type) {
    case "LINK":
      return typeof content.url === "string" ? content.url : "—";
    case "PDF":
      return typeof content.fileName === "string" && content.fileName
        ? content.fileName
        : "PDF document";
    case "VCARD":
      return typeof content.fullName === "string" ? content.fullName : "Contact";
    case "EVENT":
      return typeof content.title === "string" ? content.title : "Event";
    default:
      return "—";
  }
}

/**
 * Resolves a redirect target for types that jump straight to a URL.
 * Returns null for types that render a landing page instead (VCARD, EVENT).
 */
export function resolveRedirectUrl(
  type: QrCodeType,
  content: Record<string, unknown>,
): string | null {
  if (type === "LINK" && typeof content.url === "string") return content.url;
  if (type === "PDF" && typeof content.fileUrl === "string") return content.fileUrl;
  return null;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildVcard(content: VcardContent): string {
  const nameParts = content.fullName.trim().split(/\s+/);
  const last = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const first = nameParts[0] ?? "";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeText(last)};${escapeText(first)};;;`,
    `FN:${escapeText(content.fullName)}`,
  ];

  if (content.organization) lines.push(`ORG:${escapeText(content.organization)}`);
  if (content.jobTitle) lines.push(`TITLE:${escapeText(content.jobTitle)}`);
  if (content.phone) lines.push(`TEL;TYPE=CELL:${escapeText(content.phone)}`);
  if (content.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeText(content.email)}`);
  if (content.website) lines.push(`URL:${escapeText(content.website)}`);
  if (content.address) lines.push(`ADR;TYPE=WORK:;;${escapeText(content.address)};;;;`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function toIcsDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function buildIcs(content: EventContent, uid: string): string {
  const start = toIcsDate(content.startAt);
  const end = content.endAt ? toIcsDate(content.endAt) : "";
  const stamp = toIcsDate(new Date().toISOString());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Invoice Desk//QR Codes//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@invoicedesk`,
    `DTSTAMP:${stamp}`,
  ];

  if (start) lines.push(`DTSTART:${start}`);
  if (end) lines.push(`DTEND:${end}`);
  lines.push(`SUMMARY:${escapeText(content.title)}`);
  if (content.location) lines.push(`LOCATION:${escapeText(content.location)}`);
  if (content.description) lines.push(`DESCRIPTION:${escapeText(content.description)}`);
  if (content.url) lines.push(`URL:${escapeText(content.url)}`);

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}
