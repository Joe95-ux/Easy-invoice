import { readFile } from "node:fs/promises";
import path from "node:path";
import type Stripe from "stripe";
import { DEFAULT_BRAND_COLOR } from "@/lib/company-branding";
import { stripe } from "@/lib/stripe";

/** White plate behind the portal avatar so it does not disappear into the brand-colored sidebar. */
export const STRIPE_PORTAL_ICON_BACKGROUND = "#ffffff";

const BRANDING_PATHS = ["/v1/branding_settings", "/v1/billing/branding_settings"];

let brandingEnsurePromise: Promise<void> | null = null;
let brandingEnsured = false;

export type Rgb = { r: number; g: number; b: number };

export function parseCssColor(value: string | null | undefined): Rgb | null {
  if (!value) return null;
  const trimmed = value.trim();

  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const raw = hex[1];
    const full =
      raw.length === 3
        ? raw
            .split("")
            .map((ch) => ch + ch)
            .join("")
        : raw;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }

  const rgb = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i,
  );
  if (rgb) {
    return {
      r: Number.parseInt(rgb[1], 10),
      g: Number.parseInt(rgb[2], 10),
      b: Number.parseInt(rgb[3], 10),
    };
  }

  return null;
}

export function rgbDistance(a: Rgb, b: Rgb): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

export function colorsTooSimilar(
  left: string | null | undefined,
  right: string | null | undefined,
  threshold = 48,
): boolean {
  const a = parseCssColor(left);
  const b = parseCssColor(right);
  if (!a || !b) return false;
  return rgbDistance(a, b) <= threshold;
}

export function hexToRgbCss(hex: string): string {
  const rgb = parseCssColor(hex);
  if (!rgb) return hex;
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function rgbToHex(rgb: Rgb): string {
  const part = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${part(rgb.r)}${part(rgb.g)}${part(rgb.b)}`;
}

function fileId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return null;
}

/**
 * Stripe paints the Customer Portal sidebar with the brand/primary color.
 * Without an icon (letter avatar) or with an icon/contrast plate in that same
 * color, the company avatar disappears into the rail.
 */
export function portalAvatarBlendsWithSidebar(input: {
  hasIcon: boolean;
  primaryColor?: string | null;
  contrastColor?: string | null;
  secondaryColor?: string | null;
}): boolean {
  if (!input.hasIcon) return true;
  const primary = input.primaryColor ?? null;
  if (!primary) return false;
  return (
    colorsTooSimilar(primary, input.contrastColor) ||
    colorsTooSimilar(primary, input.secondaryColor)
  );
}

type BrandSettings = {
  icon?: unknown;
  logo?: unknown;
  primary_color?: string | null;
  contrast_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
};

function settingsFromUnknown(value: unknown): BrandSettings {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const nested =
    record.settings && typeof record.settings === "object"
      ? (record.settings as Record<string, unknown>).branding
      : null;
  const source =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : record;
  return {
    icon: source.icon,
    logo: source.logo,
    primary_color:
      typeof source.primary_color === "string" ? source.primary_color : null,
    contrast_color:
      typeof source.contrast_color === "string" ? source.contrast_color : null,
    secondary_color:
      typeof source.secondary_color === "string" ? source.secondary_color : null,
    accent_color:
      typeof source.accent_color === "string" ? source.accent_color : null,
  };
}

async function rawRequest(
  method: "GET" | "POST",
  requestPath: string,
  body?: Record<string, unknown>,
): Promise<unknown> {
  const stripeClient = stripe as Stripe & {
    rawRequest?: (
      method: string,
      path: string,
      params?: unknown,
    ) => Promise<unknown>;
  };
  if (typeof stripeClient.rawRequest === "function") {
    return stripeClient.rawRequest(method, requestPath, body);
  }
  throw new Error("Stripe client does not support rawRequest");
}

async function readPortalIcon(): Promise<Buffer> {
  const candidates = [
    path.join(process.cwd(), "public", "stripe-portal-icon.png"),
    path.join(process.cwd(), "apps", "web", "public", "stripe-portal-icon.png"),
  ];
  for (const candidate of candidates) {
    try {
      return await readFile(candidate);
    } catch {
      // try the next path
    }
  }
  throw new Error("stripe-portal-icon.png is missing");
}

const PORTAL_ICON_FILENAME = "stripe-portal-icon.png";

async function uploadPortalIcon(): Promise<string> {
  const data = await readPortalIcon();
  const file = await stripe.files.create({
    purpose: "business_icon",
    file: {
      data,
      name: PORTAL_ICON_FILENAME,
      type: "image/png",
    },
  });
  return file.id;
}

async function isOurPortalIcon(id: string | null): Promise<boolean> {
  if (!id) return false;
  try {
    const file = await stripe.files.retrieve(id);
    return file.filename === PORTAL_ICON_FILENAME;
  } catch {
    return false;
  }
}

async function readBrandSettings(): Promise<BrandSettings | null> {
  for (const requestPath of BRANDING_PATHS) {
    try {
      const result = await rawRequest("GET", `${requestPath}?use_default_styles=true`);
      return settingsFromUnknown(result);
    } catch {
      // try the next path / fallback
    }
  }

  try {
    const account = (await rawRequest("GET", "/v1/account")) as Stripe.Account;
    return settingsFromUnknown(account);
  } catch {
    return null;
  }
}

async function applyBrandSettings(iconFileId: string, current: BrandSettings | null) {
  const contrast = hexToRgbCss(STRIPE_PORTAL_ICON_BACKGROUND);
  const body: Record<string, unknown> = {
    icon: iconFileId,
    contrast_color: contrast,
  };
  if (current?.primary_color && parseCssColor(current.primary_color)) {
    body.primary_color = current.primary_color;
  }

  let lastError: unknown;
  for (const requestPath of BRANDING_PATHS) {
    try {
      await rawRequest("POST", requestPath, body);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  try {
    const account = (await rawRequest("GET", "/v1/account")) as Stripe.Account;
    if (!account.id) throw lastError ?? new Error("Stripe account id missing");
    const primaryRgb = parseCssColor(current?.primary_color);
    const branding: {
      icon: string;
      primary_color?: string;
      secondary_color?: string;
    } = {
      icon: iconFileId,
      ...(primaryRgb ? { primary_color: rgbToHex(primaryRgb) } : {}),
    };
    const secondaryBlends =
      !current?.secondary_color ||
      colorsTooSimilar(current.primary_color ?? DEFAULT_BRAND_COLOR, current.secondary_color);
    if (secondaryBlends) {
      branding.secondary_color = STRIPE_PORTAL_ICON_BACKGROUND;
    }
    await stripe.accounts.update(account.id, {
      settings: { branding },
    });
    return;
  } catch (error) {
    throw lastError ?? error;
  }
}

async function syncPortalBranding(): Promise<void> {
  const current = await readBrandSettings();
  const currentIconId = fileId(current?.icon);
  const alreadyOurs = await isOurPortalIcon(currentIconId);
  const blends = portalAvatarBlendsWithSidebar({
    hasIcon: Boolean(currentIconId),
    primaryColor: current?.primary_color,
    contrastColor: current?.contrast_color,
    secondaryColor: current?.secondary_color ?? current?.accent_color,
  });
  if (alreadyOurs && !blends) return;

  const iconFileId = alreadyOurs && currentIconId ? currentIconId : await uploadPortalIcon();
  await applyBrandSettings(iconFileId, current);
}

/**
 * Upload a white-background Invoice Desk icon and fix portal contrast when the
 * company avatar would otherwise use the same fill as the Customer Portal sidebar.
 * Self-branding is Dashboard-owned; this no-ops if Stripe rejects the update.
 */
export async function ensureStripePortalBranding(): Promise<void> {
  if (brandingEnsured) return;
  if (brandingEnsurePromise) {
    await brandingEnsurePromise;
    return;
  }

  brandingEnsurePromise = (async () => {
    try {
      await syncPortalBranding();
    } catch (error) {
      console.warn("[stripe-billing] Could not update Stripe portal icon branding", error);
    } finally {
      brandingEnsured = true;
      brandingEnsurePromise = null;
    }
  })();

  await brandingEnsurePromise;
}
