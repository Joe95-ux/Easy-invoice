import type { QrCodeType } from "@/lib/db";

export type { QrCodeType };

export const QR_CODE_TYPES = ["LINK", "PDF", "VCARD", "EVENT"] as const;

export type LinkContent = {
  url: string;
};

export type PdfContent = {
  fileUrl: string;
  fileName?: string;
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

export type QrContent =
  | ({ type?: "LINK" } & LinkContent)
  | ({ type?: "PDF" } & PdfContent)
  | ({ type?: "VCARD" } & VcardContent)
  | ({ type?: "EVENT" } & EventContent);

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
  token: string;
  content: Record<string, unknown>;
  design: QrDesign;
  scanCount: number;
  lastScannedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
};
