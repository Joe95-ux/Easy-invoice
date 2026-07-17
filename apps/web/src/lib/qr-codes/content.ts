import type {
  EventContent,
  QrCodeStatus,
  QrCodeType,
  SocialPlatform,
  VcardContent,
  WifiContent,
} from "@/lib/qr-codes/types";

export const QR_TYPE_LABEL: Record<QrCodeType, string> = {
  LINK: "Website / Link",
  PDF: "PDF",
  VCARD: "Business card",
  EVENT: "Event",
  MENU: "Menu",
  WIFI: "Wi‑Fi",
  SOCIAL: "Socials",
  COUPON: "Coupon",
};

export const QR_STATUS_LABEL: Record<QrCodeStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  DELETED: "Deleted",
};

export const QR_STATUS_BADGE_VARIANT: Record<
  QrCodeStatus,
  "success" | "warning" | "secondary"
> = {
  ACTIVE: "success",
  PAUSED: "warning",
  DELETED: "secondary",
};

export const QR_TYPE_DESCRIPTION: Record<QrCodeType, string> = {
  LINK: "Send scanners to any web address.",
  PDF: "Share a document that opens on any phone.",
  VCARD: "Save your business contact in one tap.",
  EVENT: "Add an event straight to a calendar.",
  MENU: "Show a digital menu guests can browse.",
  WIFI: "Let guests join your network instantly.",
  SOCIAL: "Share your social profiles in one place.",
  COUPON: "Hand out a promo code people can copy.",
};

export const WIFI_ENCRYPTION_LABEL: Record<WifiContent["encryption"], string> = {
  WPA: "WPA / WPA2",
  WEP: "WEP",
  nopass: "None (open)",
};

export const SOCIAL_PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  threads: "Threads",
  whatsapp: "WhatsApp",
  other: "Other",
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
    case "MENU":
      return typeof content.venueName === "string" ? content.venueName : "Menu";
    case "WIFI":
      return typeof content.ssid === "string" ? content.ssid : "Wi‑Fi";
    case "SOCIAL":
      return typeof content.title === "string" ? content.title : "Socials";
    case "COUPON":
      return typeof content.code === "string" ? content.code : "Coupon";
    default:
      return "—";
  }
}

/**
 * Resolves a redirect target for types that jump straight to a URL.
 * PDF is intentionally excluded — it must go through `/q/[token]/file`
 * so pause / delete / password gates cannot be bypassed via a durable CDN link.
 */
export function resolveRedirectUrl(
  type: QrCodeType,
  content: Record<string, unknown>,
): string | null {
  if (type === "LINK" && typeof content.url === "string") return content.url;
  return null;
}

/** Standard WIFI: URI used by camera apps for one-tap join. */
export function buildWifiUri(content: WifiContent): string {
  const escape = (value: string) =>
    value.replace(/([\\;,:"])/g, "\\$1");
  const type = content.encryption === "nopass" ? "nopass" : content.encryption;
  const password =
    content.encryption === "nopass" || !content.password
      ? ""
      : `P:${escape(content.password)};`;
  const hidden = content.hidden ? "H:true;" : "";
  return `WIFI:T:${type};S:${escape(content.ssid)};${password}${hidden};`;
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
