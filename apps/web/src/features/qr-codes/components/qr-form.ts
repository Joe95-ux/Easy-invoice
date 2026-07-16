import { DEFAULT_QR_DESIGN } from "@/lib/qr-codes/design";
import type {
  QrCodeType,
  QrDesign,
  SerializedQrCode,
} from "@/lib/qr-codes/types";

export type QrFormState = {
  name: string;
  type: QrCodeType;
  // LINK
  url: string;
  // PDF
  fileUrl: string;
  fileName: string;
  // VCARD
  fullName: string;
  organization: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  // EVENT
  title: string;
  location: string;
  description: string;
  startAt: string;
  endAt: string;
  eventUrl: string;
  design: QrDesign;
  // Access
  passwordEnabled: boolean;
  password: string;
};

export function emptyQrForm(type: QrCodeType = "LINK"): QrFormState {
  return {
    name: "",
    type,
    url: "",
    fileUrl: "",
    fileName: "",
    fullName: "",
    organization: "",
    jobTitle: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    title: "",
    location: "",
    description: "",
    startAt: "",
    endAt: "",
    eventUrl: "",
    design: { ...DEFAULT_QR_DESIGN },
    passwordEnabled: false,
    password: "",
  };
}

function toDatetimeLocal(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(local: string): string {
  if (!local) return "";
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function formFromSerialized(qr: SerializedQrCode): QrFormState {
  const base = emptyQrForm(qr.type);
  const content = qr.content;
  return {
    ...base,
    name: qr.name,
    type: qr.type,
    url: str(content.url),
    fileUrl: str(content.fileUrl),
    fileName: str(content.fileName),
    fullName: str(content.fullName),
    organization: str(content.organization),
    jobTitle: str(content.jobTitle),
    phone: str(content.phone),
    email: str(content.email),
    website: str(content.website),
    address: str(content.address),
    title: str(content.title),
    location: str(content.location),
    description: str(content.description),
    startAt: toDatetimeLocal(content.startAt),
    endAt: toDatetimeLocal(content.endAt),
    eventUrl: str(content.url),
    design: qr.design,
    passwordEnabled: qr.passwordProtected,
    password: "",
  };
}

function withValues(entries: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries)) {
    const trimmed = value.trim();
    if (trimmed) result[key] = trimmed;
  }
  return result;
}

/** Build the type-specific content payload sent to the API. */
export function buildQrContent(form: QrFormState): Record<string, unknown> {
  switch (form.type) {
    case "LINK":
      return { url: form.url.trim() };
    case "PDF":
      return withValues({ fileUrl: form.fileUrl, fileName: form.fileName });
    case "VCARD":
      return withValues({
        fullName: form.fullName,
        organization: form.organization,
        jobTitle: form.jobTitle,
        phone: form.phone,
        email: form.email,
        website: form.website,
        address: form.address,
      });
    case "EVENT": {
      const content: Record<string, unknown> = {
        title: form.title.trim(),
        startAt: toIso(form.startAt),
      };
      const optional = withValues({
        location: form.location,
        description: form.description,
        url: form.eventUrl,
      });
      const end = toIso(form.endAt);
      if (end) content.endAt = end;
      return { ...content, ...optional };
    }
    default:
      return {};
  }
}

/** Whether the current content step has enough to continue. */
export function isContentComplete(form: QrFormState): boolean {
  switch (form.type) {
    case "LINK":
      return form.url.trim().length > 0;
    case "PDF":
      return form.fileUrl.trim().length > 0;
    case "VCARD":
      return form.fullName.trim().length > 0;
    case "EVENT":
      return form.title.trim().length > 0 && form.startAt.trim().length > 0;
    default:
      return false;
  }
}
