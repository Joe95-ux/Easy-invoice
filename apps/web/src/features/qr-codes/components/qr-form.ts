import { DEFAULT_QR_DESIGN } from "@/lib/qr-codes/design";
import type {
  MenuItem,
  QrCodeType,
  QrDesign,
  SerializedQrCode,
  SocialLink,
  SocialPlatform,
  WifiEncryption,
} from "@/lib/qr-codes/types";
import { SOCIAL_PLATFORMS } from "@/lib/qr-codes/types";

export type QrFormState = {
  name: string;
  type: QrCodeType;
  // LINK
  url: string;
  // PDF
  fileUrl: string;
  fileName: string;
  filePublicId: string;
  deliveryType: "authenticated" | "upload" | "";
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
  // MENU
  venueName: string;
  menuSubtitle: string;
  menuCurrency: string;
  menuItems: MenuItem[];
  // WIFI
  wifiSsid: string;
  wifiPassword: string;
  wifiEncryption: WifiEncryption;
  wifiHidden: boolean;
  // SOCIAL
  socialTitle: string;
  socialSubtitle: string;
  socialLinks: SocialLink[];
  // COUPON
  couponCode: string;
  couponTitle: string;
  couponDescription: string;
  couponTerms: string;
  couponExpiresAt: string;
  design: QrDesign;
  // Access
  passwordEnabled: boolean;
  password: string;
};

export function emptyMenuItem(): MenuItem {
  return { name: "", description: "", price: "", section: "" };
}

export function emptySocialLink(): SocialLink {
  return { platform: "instagram", url: "", label: "" };
}

export function emptyQrForm(type: QrCodeType = "LINK"): QrFormState {
  return {
    name: "",
    type,
    url: "",
    fileUrl: "",
    fileName: "",
    filePublicId: "",
    deliveryType: "",
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
    venueName: "",
    menuSubtitle: "",
    menuCurrency: "$",
    menuItems: [emptyMenuItem()],
    wifiSsid: "",
    wifiPassword: "",
    wifiEncryption: "WPA",
    wifiHidden: false,
    socialTitle: "",
    socialSubtitle: "",
    socialLinks: [emptySocialLink()],
    couponCode: "",
    couponTitle: "",
    couponDescription: "",
    couponTerms: "",
    couponExpiresAt: "",
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

function toDateInput(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toIso(local: string): string {
  if (!local) return "";
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseMenuItems(value: unknown): MenuItem[] {
  if (!Array.isArray(value) || value.length === 0) return [emptyMenuItem()];
  return value.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      name: str(row.name),
      description: str(row.description),
      price: str(row.price),
      section: str(row.section),
    };
  });
}

function parseSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value) || value.length === 0) return [emptySocialLink()];
  return value.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const platform = str(row.platform) as SocialPlatform;
    return {
      platform: SOCIAL_PLATFORMS.includes(platform) ? platform : "other",
      url: str(row.url),
      label: str(row.label),
    };
  });
}

export function formFromSerialized(qr: SerializedQrCode): QrFormState {
  const base = emptyQrForm(qr.type);
  const content = qr.content;
  const encryption = str(content.encryption);
  return {
    ...base,
    name: qr.name,
    type: qr.type,
    url: str(content.url),
    fileUrl: str(content.fileUrl),
    fileName: str(content.fileName),
    filePublicId: str(content.filePublicId),
    deliveryType:
      content.deliveryType === "authenticated" || content.deliveryType === "upload"
        ? content.deliveryType
        : "",
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
    venueName: str(content.venueName),
    menuSubtitle: str(content.subtitle),
    menuCurrency: str(content.currency) || "$",
    menuItems: parseMenuItems(content.items),
    wifiSsid: str(content.ssid),
    wifiPassword: str(content.password),
    wifiEncryption:
      encryption === "WEP" || encryption === "nopass" || encryption === "WPA"
        ? encryption
        : "WPA",
    wifiHidden: Boolean(content.hidden),
    socialTitle: str(content.title),
    socialSubtitle: str(content.subtitle),
    socialLinks: parseSocialLinks(content.links),
    couponCode: str(content.code),
    couponTitle: str(content.title),
    couponDescription: str(content.description),
    couponTerms: str(content.terms),
    couponExpiresAt: toDateInput(content.expiresAt),
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
    case "PDF": {
      const pdf: Record<string, unknown> = withValues({
        fileUrl: form.fileUrl,
        fileName: form.fileName,
        filePublicId: form.filePublicId,
      });
      if (form.deliveryType === "authenticated" || form.deliveryType === "upload") {
        pdf.deliveryType = form.deliveryType;
      }
      return pdf;
    }
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
    case "MENU":
      return {
        venueName: form.venueName.trim(),
        ...withValues({
          subtitle: form.menuSubtitle,
          currency: form.menuCurrency || "$",
        }),
        items: form.menuItems
          .filter((item) => item.name.trim())
          .map((item) => ({
            name: item.name.trim(),
            ...withValues({
              description: item.description ?? "",
              price: item.price ?? "",
              section: item.section ?? "",
            }),
          })),
      };
    case "WIFI":
      return {
        ssid: form.wifiSsid.trim(),
        encryption: form.wifiEncryption,
        ...(form.wifiEncryption !== "nopass" && form.wifiPassword
          ? { password: form.wifiPassword }
          : {}),
        ...(form.wifiHidden ? { hidden: true } : {}),
      };
    case "SOCIAL":
      return {
        title: form.socialTitle.trim(),
        ...withValues({ subtitle: form.socialSubtitle }),
        links: form.socialLinks
          .filter((link) => link.url.trim())
          .map((link) => ({
            platform: link.platform,
            url: link.url.trim(),
            ...withValues({ label: link.label ?? "" }),
          })),
      };
    case "COUPON": {
      const content: Record<string, unknown> = {
        code: form.couponCode.trim(),
        ...withValues({
          title: form.couponTitle,
          description: form.couponDescription,
          terms: form.couponTerms,
        }),
      };
      if (form.couponExpiresAt.trim()) {
        content.expiresAt = form.couponExpiresAt.trim();
      }
      return content;
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
    case "MENU":
      return (
        form.venueName.trim().length > 0 &&
        form.menuItems.some((item) => item.name.trim().length > 0)
      );
    case "WIFI":
      return (
        form.wifiSsid.trim().length > 0 &&
        (form.wifiEncryption === "nopass" || form.wifiPassword.trim().length > 0)
      );
    case "SOCIAL":
      return (
        form.socialTitle.trim().length > 0 &&
        form.socialLinks.some((link) => link.url.trim().length > 0)
      );
    case "COUPON":
      return form.couponCode.trim().length > 0;
    default:
      return false;
  }
}
