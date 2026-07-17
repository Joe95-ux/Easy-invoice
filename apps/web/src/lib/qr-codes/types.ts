import type { QrCodeStatus, QrCodeType } from "@/lib/db";

export type { QrCodeStatus, QrCodeType };

export const QR_CODE_TYPES = [
  "LINK",
  "PDF",
  "VCARD",
  "EVENT",
  "MENU",
  "WIFI",
  "SOCIAL",
  "COUPON",
] as const;

export const QR_CODE_STATUSES = ["ACTIVE", "PAUSED", "DELETED"] as const;

export const WIFI_ENCRYPTIONS = ["WPA", "WEP", "nopass"] as const;
export type WifiEncryption = (typeof WIFI_ENCRYPTIONS)[number];

export const SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "x",
  "linkedin",
  "youtube",
  "tiktok",
  "threads",
  "whatsapp",
  "other",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type LinkContent = {
  url: string;
};

export type PdfContent = {
  fileUrl: string;
  fileName?: string;
  /** Cloudinary public_id for authenticated delivery. */
  filePublicId?: string;
  deliveryType?: "authenticated" | "upload";
};

export type VcardContent = {
  fullName: string;
  organization?: string;
  jobTitle?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
};

export type EventContent = {
  title: string;
  location?: string;
  description?: string;
  startAt: string;
  endAt?: string;
  url?: string;
};

export type MenuItem = {
  name: string;
  description?: string;
  price?: string;
  section?: string;
};

export type MenuContent = {
  venueName: string;
  subtitle?: string;
  currency?: string;
  items: MenuItem[];
};

export type WifiContent = {
  ssid: string;
  password?: string;
  encryption: WifiEncryption;
  hidden?: boolean;
};

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
  label?: string;
};

export type SocialContent = {
  title: string;
  subtitle?: string;
  links: SocialLink[];
};

export type CouponContent = {
  code: string;
  title?: string;
  description?: string;
  terms?: string;
  /** ISO date string (date-only or datetime). */
  expiresAt?: string;
};

export type QrContent =
  | ({ type?: "LINK" } & LinkContent)
  | ({ type?: "PDF" } & PdfContent)
  | ({ type?: "VCARD" } & VcardContent)
  | ({ type?: "EVENT" } & EventContent)
  | ({ type?: "MENU" } & MenuContent)
  | ({ type?: "WIFI" } & WifiContent)
  | ({ type?: "SOCIAL" } & SocialContent)
  | ({ type?: "COUPON" } & CouponContent);

export type QrDotStyle = "squares" | "dots" | "fluid";

export type QrDesign = {
  fgColor: string;
  bgColor: string;
  dotStyle: QrDotStyle;
  /** Corner (eye) radius as a percentage 0–50. */
  eyeRadius: number;
  /** Overlay the company logo in the center of the code. */
  logoEnabled: boolean;
};

export type SerializedQrCode = {
  id: string;
  name: string;
  type: QrCodeType;
  status: QrCodeStatus;
  token: string;
  passwordProtected: boolean;
  content: Record<string, unknown>;
  design: QrDesign;
  scanCount: number;
  lastScannedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
};
