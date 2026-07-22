import type { QrDesign, QrDotStyle } from "@/lib/qr-codes/types";
import {
  DEFAULT_FRAME_LABEL,
  isQrFrameId,
  normalizeFrameLabel,
} from "@/lib/qr-codes/frames";

export const DEFAULT_QR_DESIGN: QrDesign = {
  fgColor: "#1e3a5f",
  bgColor: "#ffffff",
  dotStyle: "squares",
  eyeRadius: 0,
  logoEnabled: false,
  frameId: "none",
  frameLabel: DEFAULT_FRAME_LABEL,
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

/**
 * Curated pairs for the design step. Tuned so each brand color works as a
 * business landing hero (solid, corporate) with a readable soft CTA tint.
 */
export const QR_COLOR_PRESETS: { name: string; fgColor: string; bgColor: string }[] = [
  { name: "Navy", fgColor: "#1e3a5f", bgColor: "#ffffff" },
  { name: "Indigo", fgColor: "#3730a3", bgColor: "#ffffff" },
  { name: "Teal", fgColor: "#0f766e", bgColor: "#ffffff" },
  { name: "Forest", fgColor: "#166534", bgColor: "#ffffff" },
  { name: "Slate", fgColor: "#334155", bgColor: "#f8fafc" },
  { name: "Sky", fgColor: "#0369a1", bgColor: "#f0f9ff" },
  { name: "Wine", fgColor: "#9f1239", bgColor: "#ffffff" },
  { name: "Charcoal", fgColor: "#f8fafc", bgColor: "#1e293b" },
];

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX_PATTERN.test(value) ? value : fallback;
}

type Rgb = { r: number; g: number; b: number };

function parseHex(hex: string): Rgb | null {
  if (!HEX_PATTERN.test(hex)) return null;
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

/** Relative luminance 0–1 (WCAG). */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastTextColor(background: string): string {
  return relativeLuminance(background) > 0.55 ? "#0f172a" : "#ffffff";
}

export type BusinessLandingColors = {
  heroBg: string;
  heroText: string;
  ctaBg: string;
  ctaText: string;
  accent: string;
};

/**
 * Maps a QR fg/bg palette onto the Business landing hero + CTA.
 * Light paper backgrounds yield a solid brand hero and a soft brand-tinted CTA.
 * Inverted (light-on-dark) palettes swap roles so the dark color fills the hero.
 */
export function resolveBusinessLandingColors(
  fgColor: string,
  bgColor: string,
): BusinessLandingColors {
  const fg = safeColor(fgColor, DEFAULT_QR_DESIGN.fgColor);
  const bg = safeColor(bgColor, DEFAULT_QR_DESIGN.bgColor);
  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);
  const paper = 0.85;

  if (bgLum >= paper && fgLum < paper) {
    const heroText = contrastTextColor(fg);
    return {
      heroBg: fg,
      heroText,
      ctaBg: fg,
      ctaText: heroText,
      accent: fg,
    };
  }

  if (fgLum >= paper && bgLum < paper) {
    return {
      heroBg: bg,
      heroText: fg,
      ctaBg: bg,
      ctaText: fg,
      accent: bg,
    };
  }

  const heroBg = fgLum <= bgLum ? fg : bg;
  const heroText = contrastTextColor(heroBg);
  return {
    heroBg,
    heroText,
    ctaBg: heroBg,
    ctaText: heroText,
    accent: heroBg,
  };
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
    frameId: isQrFrameId(source.frameId) ? source.frameId : DEFAULT_QR_DESIGN.frameId,
    frameLabel: normalizeFrameLabel(source.frameLabel ?? DEFAULT_FRAME_LABEL),
  };
}
