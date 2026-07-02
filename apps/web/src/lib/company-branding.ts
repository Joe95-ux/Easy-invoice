export type LogoBg = "white" | "dark";
export type LogoPlacement = "watermark" | "header";

export const LOGO_BG_OPTIONS = [
  { value: "white" as const, label: "White" },
  { value: "dark" as const, label: "Dark" },
];

export const LOGO_PLACEMENT_OPTIONS = [
  {
    value: "watermark" as const,
    label: "Watermark",
    description: "Subtle centered logo behind the document content.",
  },
  {
    value: "header" as const,
    label: "Header",
    description: "Logo in the top area — company name is hidden to avoid clutter.",
  },
];

export const DEFAULT_BRAND_COLOR = "#4338ca";

export function normalizeLogoBg(value: string | null | undefined): LogoBg {
  return value === "dark" ? "dark" : "white";
}

export function normalizeLogoPlacement(value: string | null | undefined): LogoPlacement {
  return value === "header" ? "header" : "watermark";
}

export function logoPreviewClassName(logoBg: LogoBg): string {
  return logoBg === "dark"
    ? "bg-slate-900 ring-white/10"
    : "bg-white ring-black/5 dark:ring-white/10";
}

export function logoPdfWrapClass(logoBg: LogoBg): string {
  return logoBg === "dark" ? "company-logo--dark" : "company-logo--white";
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function companyBrandingFields(company: {
  logoBg?: string | null;
  logoPlacement?: string | null;
  brandColor?: string | null;
}) {
  return {
    logoBg: normalizeLogoBg(company.logoBg),
    logoPlacement: normalizeLogoPlacement(company.logoPlacement),
    brandColor: company.brandColor ?? null,
  };
}

export function buildBrandColorCss(brandColor: string | null | undefined): string {
  if (!brandColor || !/^#[0-9A-Fa-f]{6}$/.test(brandColor)) return "";

  const light = hexToRgba(brandColor, 0.08);
  const lightStrong = hexToRgba(brandColor, 0.14);
  const border = hexToRgba(brandColor, 0.35);

  return `
.invoice-title,
.doc-title,
.masthead .doc-title { color: ${brandColor} !important; }

.company-info > .company-name,
.header-main > .company-name,
.masthead > .company-name,
.brand .company-name { color: ${brandColor} !important; }

.header-dark .brand .company-name { color: #fff !important; }

.party-label,
.block-label { color: ${brandColor} !important; }

.accent-bar { background: ${brandColor} !important; }

.header { border-top-color: ${brandColor} !important; }

table.line-items th {
  background: ${light} !important;
  color: ${brandColor} !important;
  border-bottom-color: ${border} !important;
}

table.line-items tbody tr.band-even {
  background: ${light} !important;
}
table.line-items tbody tr.band-even td {
  border-bottom-color: ${lightStrong} !important;
}

.terms-notes-label { color: ${brandColor} !important; }

.totals-row.total {
  border-top-color: ${brandColor} !important;
  color: ${brandColor} !important;
}

.rule { background: ${brandColor} !important; }

.segment-rule span { background: ${brandColor} !important; }

.page-content > .header,
.header { border-bottom-color: ${brandColor} !important; }

.doc-number {
  background: ${light} !important;
  color: ${brandColor} !important;
}

.invoice-footer { border-top-color: ${border} !important; }
`.trim();
}
