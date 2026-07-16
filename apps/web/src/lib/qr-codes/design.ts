import type { QrDesign, QrDotStyle } from "@/lib/qr-codes/types";

export const DEFAULT_QR_DESIGN: QrDesign = {
  fgColor: "#111827",
  bgColor: "#ffffff",
  dotStyle: "squares",
  eyeRadius: 0,
  logoEnabled: false,
};

export const QR_DOT_STYLES: { value: QrDotStyle; label: string }[] = [
  { value: "squares", label: "Classic" },
  { value: "dots", label: "Dots" },
  { value: "fluid", label: "Fluid" },
];

export const QR_EYE_STYLES: { value: number; label: string }[] = [
  { value: 0, label: "Square" },
  { value: 25, label: "Rounded" },
  { value: 50, label: "Circle" },
];

/** Curated color pairs shown as one-tap presets in the design step. */
export const QR_COLOR_PRESETS: { name: string; fgColor: string; bgColor: string }[] = [
  { name: "Ink", fgColor: "#111827", bgColor: "#ffffff" },
  { name: "Indigo", fgColor: "#4338ca", bgColor: "#ffffff" },
  { name: "Emerald", fgColor: "#047857", bgColor: "#ffffff" },
  { name: "Rose", fgColor: "#be123c", bgColor: "#ffffff" },
  { name: "Amber", fgColor: "#b45309", bgColor: "#fffbeb" },
  { name: "Sky", fgColor: "#0369a1", bgColor: "#f0f9ff" },
  { name: "Slate", fgColor: "#f8fafc", bgColor: "#0f172a" },
  { name: "Violet", fgColor: "#ffffff", bgColor: "#4c1d95" },
];

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX_PATTERN.test(value) ? value : fallback;
}

function safeDotStyle(value: unknown): QrDotStyle {
  return value === "dots" || value === "fluid" || value === "squares"
    ? value
    : DEFAULT_QR_DESIGN.dotStyle;
}

export function normalizeQrDesign(raw: unknown): QrDesign {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const eyeRadiusRaw = Number(source.eyeRadius);

  return {
    fgColor: safeColor(source.fgColor, DEFAULT_QR_DESIGN.fgColor),
    bgColor: safeColor(source.bgColor, DEFAULT_QR_DESIGN.bgColor),
    dotStyle: safeDotStyle(source.dotStyle),
    eyeRadius: Number.isFinite(eyeRadiusRaw)
      ? Math.min(50, Math.max(0, Math.round(eyeRadiusRaw)))
      : DEFAULT_QR_DESIGN.eyeRadius,
    logoEnabled: source.logoEnabled === true,
  };
}
