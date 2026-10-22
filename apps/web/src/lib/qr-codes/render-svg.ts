import QRCode from "qrcode";
import { DEFAULT_QR_DESIGN, normalizeQrDesign, resolveQrCenterLogoUrl } from "@/lib/qr-codes/design";
import { getFrameLayout, normalizeFrameLabel } from "@/lib/qr-codes/frames";
import type { QrDesign, QrDotStyle } from "@/lib/qr-codes/types";

const MODULE_PX = 8;
const QUIET_MODULES = 2;
const LOGO_FETCH_TIMEOUT_MS = 4_000;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchImageDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS),
      headers: { Accept: "image/*" },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/png";
    if (!contentType.startsWith("image/")) return null;
    const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

function isFinder(row: number, col: number, size: number): boolean {
  const inPattern = (r: number, c: number) => r >= 0 && r < 7 && c >= 0 && c < 7;
  return (
    inPattern(row, col) ||
    inPattern(row, col - (size - 7)) ||
    inPattern(row - (size - 7), col)
  );
}

function moduleShape(
  x: number,
  y: number,
  size: number,
  style: QrDotStyle,
  fill: string,
): string {
  if (style === "dots") {
    const r = size * 0.42;
    return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${r}" fill="${fill}"/>`;
  }
  const radius = style === "fluid" ? size * 0.35 : 0;
  if (radius <= 0) {
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${fill}"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}"/>`;
}

function finderSvg(
  originX: number,
  originY: number,
  module: number,
  fg: string,
  bg: string,
  eyeRadius: number,
): string {
  const outer = 7 * module;
  const ring = 5 * module;
  const core = 3 * module;
  const outerR = Math.round((eyeRadius / 50) * (outer * 0.22));
  const ringR = Math.round((eyeRadius / 50) * (ring * 0.22));
  const coreR = Math.round((eyeRadius / 50) * (core * 0.22));
  return [
    `<rect x="${originX}" y="${originY}" width="${outer}" height="${outer}" rx="${outerR}" fill="${fg}"/>`,
    `<rect x="${originX + module}" y="${originY + module}" width="${ring}" height="${ring}" rx="${ringR}" fill="${bg}"/>`,
    `<rect x="${originX + module * 2}" y="${originY + module * 2}" width="${core}" height="${core}" rx="${coreR}" fill="${fg}"/>`,
  ].join("");
}

function captionText(
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): string {
  const fontSize = Math.max(10, Math.round(height * 0.42));
  return (
    `<text x="${x + width / 2}" y="${y + height / 2}" fill="${color}" ` +
    `font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="${fontSize}" ` +
    `font-weight="600" text-anchor="middle" dominant-baseline="middle">` +
    `${escapeXml(text)}` +
    `</text>`
  );
}

function bannerPath(
  x: number,
  y: number,
  w: number,
  h: number,
  notch: "up" | "down" | "none",
): string {
  const notchSize = Math.min(h * 0.45, w * 0.08);
  if (notch === "up") {
    return `M ${x} ${y + notchSize} L ${x + w / 2 - notchSize} ${y + notchSize} L ${x + w / 2} ${y} L ${x + w / 2 + notchSize} ${y + notchSize} L ${x + w} ${y + notchSize} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
  }
  if (notch === "down") {
    return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h - notchSize} L ${x + w / 2 + notchSize} ${y + h - notchSize} L ${x + w / 2} ${y + h} L ${x + w / 2 - notchSize} ${y + h - notchSize} L ${x} ${y + h - notchSize} Z`;
  }
  return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
}

function frameMarkup(
  qrSize: number,
  design: Pick<QrDesign, "fgColor" | "bgColor" | "frameId" | "frameLabel">,
): { width: number; height: number; qrX: number; qrY: number; extras: string } {
  const layout = getFrameLayout(qrSize, design.frameId);
  const fg = design.fgColor;
  const bg = design.bgColor;
  const label = normalizeFrameLabel(design.frameLabel);
  const stroke = Math.max(1.5, Math.round(qrSize * 0.012));
  const radius = layout.radius;
  const extras: string[] = [];

  extras.push(
    `<rect width="${layout.width}" height="${layout.height}" rx="${radius}" fill="${bg}"/>`,
  );

  const outline = (
    inset: number,
    extraRx = radius,
    dash?: string,
    width = stroke,
    opacity = 1,
  ) =>
    `<rect x="${inset}" y="${inset}" width="${layout.width - inset * 2}" height="${layout.height - inset * 2}" rx="${Math.max(0, extraRx)}" fill="none" stroke="${fg}" stroke-width="${width}"${dash ? ` stroke-dasharray="${dash}"` : ""}${opacity < 1 ? ` opacity="${opacity}"` : ""}/>`;

  switch (design.frameId) {
    case "none":
      extras.length = 0;
      extras.push(`<rect width="${layout.width}" height="${layout.height}" fill="${bg}"/>`);
      break;
    case "border":
      extras.push(outline(stroke / 2));
      break;
    case "soft":
      extras.push(outline(stroke / 2, radius, undefined, stroke, 0.55));
      break;
    case "badge":
      extras.push(outline(stroke, radius, undefined, stroke * 2.2));
      break;
    case "caption": {
      extras.push(outline(stroke / 2));
      const barY = layout.qrY + qrSize + layout.pad * 0.25;
      extras.push(`<rect x="0" y="${barY}" width="${layout.width}" height="${layout.height - barY}" fill="${fg}"/>`);
      extras.push(captionText(label, 0, barY, layout.width, layout.height - barY, bg));
      break;
    }
    case "pill": {
      extras.push(outline(stroke / 2));
      const pillH = Math.round(layout.captionHeight * 0.72);
      const pillW = Math.round(layout.width * 0.72);
      const pillX = (layout.width - pillW) / 2;
      const pillY = layout.qrY + qrSize + (layout.captionHeight - pillH) / 2 + layout.pad * 0.15;
      extras.push(
        `<rect x="${pillX}" y="${pillY}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="${fg}"/>`,
      );
      extras.push(captionText(label, pillX, pillY, pillW, pillH, bg));
      break;
    }
    case "dashed":
      extras.push(outline(stroke / 2, radius, `${stroke * 2.5} ${stroke * 1.8}`));
      break;
    case "double":
      extras.push(outline(stroke / 2));
      extras.push(outline(stroke * 3.2, Math.max(0, radius - stroke * 1.28)));
      break;
    case "brackets": {
      const len = Math.round(layout.pad * 0.85);
      const t = stroke * 1.4;
      const inset = Math.round(layout.pad * 0.35);
      const w = layout.width;
      const h = layout.height;
      const line = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) =>
        `<path d="M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3}" fill="none" stroke="${fg}" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round"/>`;
      extras.push(line(inset + len, inset, inset, inset, inset, inset + len));
      extras.push(line(w - inset - len, inset, w - inset, inset, w - inset, inset + len));
      extras.push(line(inset + len, h - inset, inset, h - inset, inset, h - inset - len));
      extras.push(line(w - inset - len, h - inset, w - inset, h - inset, w - inset, h - inset - len));
      break;
    }
    case "banner-bottom": {
      extras.push(outline(stroke / 2));
      const y = layout.qrY + qrSize;
      const h = layout.height - y;
      extras.push(`<path d="${bannerPath(0, y, layout.width, h, "up")}" fill="${fg}"/>`);
      extras.push(captionText(label, 0, y + h * 0.18, layout.width, h * 0.82, bg));
      break;
    }
    case "banner-top": {
      extras.push(outline(stroke / 2));
      extras.push(`<path d="${bannerPath(0, 0, layout.width, layout.qrY, "down")}" fill="${fg}"/>`);
      extras.push(captionText(label, 0, 0, layout.width, layout.qrY * 0.82, bg));
      break;
    }
    case "balloon-bottom": {
      extras.push(
        `<rect x="${stroke / 2}" y="${stroke / 2}" width="${layout.width - stroke}" height="${layout.qrY + qrSize + layout.pad - stroke}" rx="${radius}" fill="none" stroke="${fg}" stroke-width="${stroke}"/>`,
      );
      const areaY = layout.qrY + qrSize;
      const areaH = layout.height - areaY;
      const pointer = Math.round(areaH * 0.28);
      const x = layout.width * 0.08;
      const w = layout.width * 0.84;
      const h = areaH - layout.pad * 0.2;
      const bubbleY = areaY + pointer;
      const bubbleH = h - pointer;
      const r = Math.min(bubbleH / 2, w * 0.12);
      extras.push(
        `<rect x="${x}" y="${bubbleY}" width="${w}" height="${bubbleH}" rx="${r}" fill="${fg}"/>`,
      );
      extras.push(
        `<path d="M ${x + w / 2 - pointer} ${areaY + pointer} L ${x + w / 2} ${areaY} L ${x + w / 2 + pointer} ${areaY + pointer} Z" fill="${fg}"/>`,
      );
      extras.push(captionText(label, x, bubbleY, w, bubbleH, bg));
      break;
    }
    case "balloon-top": {
      extras.push(
        `<rect x="${stroke / 2}" y="${layout.qrY - layout.pad + stroke / 2}" width="${layout.width - stroke}" height="${layout.height - (layout.qrY - layout.pad) - stroke}" rx="${radius}" fill="none" stroke="${fg}" stroke-width="${stroke}"/>`,
      );
      const areaH = layout.qrY;
      const pointer = Math.round(areaH * 0.28);
      const x = layout.width * 0.08;
      const w = layout.width * 0.84;
      const y = layout.pad * 0.2;
      const h = areaH - layout.pad * 0.2;
      const bubbleH = h - pointer;
      const r = Math.min(bubbleH / 2, w * 0.12);
      extras.push(`<rect x="${x}" y="${y}" width="${w}" height="${bubbleH}" rx="${r}" fill="${fg}"/>`);
      extras.push(
        `<path d="M ${x + w / 2 - pointer} ${y + bubbleH} L ${x + w / 2} ${y + h} L ${x + w / 2 + pointer} ${y + bubbleH} Z" fill="${fg}"/>`,
      );
      extras.push(captionText(label, x, y, w, bubbleH, bg));
      break;
    }
    case "ribbon-bottom": {
      extras.push(
        `<rect x="${stroke / 2}" y="${stroke / 2}" width="${layout.width - stroke}" height="${layout.qrY + qrSize + layout.pad - stroke}" rx="${radius}" fill="none" stroke="${fg}" stroke-width="${stroke}"/>`,
      );
      const ribbonH = Math.round(layout.captionHeight * 0.78);
      const ribbonY =
        layout.qrY + qrSize + (layout.captionHeight - ribbonH) / 2 + layout.pad * 0.1;
      const x = layout.width * 0.06;
      const w = layout.width * 0.88;
      const fold = Math.min(ribbonH * 0.35, w * 0.08);
      extras.push(
        `<path d="M ${x + fold} ${ribbonY} L ${x + w - fold} ${ribbonY} L ${x + w} ${ribbonY + ribbonH / 2} L ${x + w - fold} ${ribbonY + ribbonH} L ${x + fold} ${ribbonY + ribbonH} L ${x} ${ribbonY + ribbonH / 2} Z" fill="${fg}"/>`,
      );
      extras.push(captionText(label, x + fold, ribbonY, w - fold * 2, ribbonH, bg));
      break;
    }
    default:
      break;
  }

  return {
    width: layout.width,
    height: layout.height,
    qrX: layout.qrX,
    qrY: layout.qrY,
    extras: extras.join(""),
  };
}

function buildQrModulesSvg(value: string, design: QrDesign, logoDataUrl: string | null): {
  size: number;
  markup: string;
} {
  const useLogo = Boolean(logoDataUrl);
  const qr = QRCode.create(value || " ", {
    errorCorrectionLevel: useLogo || design.logoEnabled ? "H" : "M",
  });
  const count = qr.modules.size;
  const quiet = QUIET_MODULES * MODULE_PX;
  const size = count * MODULE_PX + quiet * 2;
  const fg = design.fgColor;
  const bg = design.bgColor;
  const parts: string[] = [`<rect width="${size}" height="${size}" fill="${bg}"/>`];

  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (isFinder(row, col, count)) continue;
      if (!qr.modules.get(row, col)) continue;
      parts.push(
        moduleShape(
          quiet + col * MODULE_PX,
          quiet + row * MODULE_PX,
          MODULE_PX,
          design.dotStyle,
          fg,
        ),
      );
    }
  }

  const finderOrigins: Array<[number, number]> = [
    [0, 0],
    [count - 7, 0],
    [0, count - 7],
  ];
  for (const [row, col] of finderOrigins) {
    parts.push(
      finderSvg(
        quiet + col * MODULE_PX,
        quiet + row * MODULE_PX,
        MODULE_PX,
        fg,
        bg,
        design.eyeRadius,
      ),
    );
  }

  if (logoDataUrl) {
    const logo = Math.round(size * 0.22);
    const pad = 3;
    const box = logo + pad * 2;
    const x = (size - box) / 2;
    const y = (size - box) / 2;
    parts.push(`<rect x="${x}" y="${y}" width="${box}" height="${box}" fill="${bg}"/>`);
    const href = escapeXml(logoDataUrl);
    parts.push(
      `<image href="${href}" xlink:href="${href}" x="${x + pad}" y="${y + pad}" width="${logo}" height="${logo}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  return { size, markup: parts.join("") };
}

/** SVG string of a designed QR (colors, dots, eyes, logo, frame). */
export async function renderQrDesignSvg(
  value: string,
  design?: QrDesign | null,
  companyLogoUrl?: string | null,
): Promise<string> {
  const colors = normalizeQrDesign(design ?? DEFAULT_QR_DESIGN);
  const logoUrl = resolveQrCenterLogoUrl(colors, companyLogoUrl);
  const logoDataUrl = logoUrl ? await fetchImageDataUrl(logoUrl) : null;
  const qr = buildQrModulesSvg(value, colors, logoDataUrl);
  const frame = frameMarkup(qr.size, colors);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="QR code">` +
    `${frame.extras}` +
    `<g transform="translate(${frame.qrX} ${frame.qrY})">${qr.markup}</g>` +
    `</svg>`
  );
}

/** Data URL for embedding in invoice HTML/PDF. */
export async function renderQrDesignDataUrl(
  value: string,
  design?: QrDesign | null,
  companyLogoUrl?: string | null,
): Promise<string> {
  const svg = await renderQrDesignSvg(value, design, companyLogoUrl);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
