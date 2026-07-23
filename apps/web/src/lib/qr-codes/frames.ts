import type { QrDesign, QrFrameId } from "@/lib/qr-codes/types";

export type QrFrameDefinition = {
  id: QrFrameId;
  name: string;
  description: string;
  /** Shows the optional caption input when selected. */
  usesLabel: boolean;
};

export type FrameLabelPlacement = "none" | "top" | "bottom";

export const QR_FRAMES: QrFrameDefinition[] = [
  { id: "none", name: "None", description: "Just the code", usesLabel: false },
  { id: "border", name: "Border", description: "Thin rounded stroke", usesLabel: false },
  { id: "soft", name: "Soft pad", description: "Light padding + stroke", usesLabel: false },
  { id: "badge", name: "Badge", description: "Bold sticker look", usesLabel: false },
  { id: "caption", name: "Caption", description: "Bottom label bar", usesLabel: true },
  { id: "pill", name: "Pill", description: "Rounded caption", usesLabel: true },
  { id: "dashed", name: "Dashed", description: "Craft-style stroke", usesLabel: false },
  { id: "double", name: "Double", description: "Formal double line", usesLabel: false },
  { id: "brackets", name: "Brackets", description: "Open corner marks", usesLabel: false },
  { id: "banner-bottom", name: "Banner", description: "Bottom SCAN ME bar", usesLabel: true },
  { id: "banner-top", name: "Banner top", description: "Top SCAN ME bar", usesLabel: true },
  { id: "balloon-bottom", name: "Balloon", description: "Speech bubble below", usesLabel: true },
  { id: "balloon-top", name: "Balloon top", description: "Speech bubble above", usesLabel: true },
  { id: "ribbon-bottom", name: "Ribbon", description: "Folded ribbon CTA", usesLabel: true },
];

export const DEFAULT_FRAME_LABEL = "Scan me";
export const FRAME_LABEL_MAX = 20;

const FRAME_IDS = new Set<QrFrameId>(QR_FRAMES.map((frame) => frame.id));

export function isQrFrameId(value: unknown): value is QrFrameId {
  return typeof value === "string" && FRAME_IDS.has(value as QrFrameId);
}

export function getQrFrame(id: QrFrameId): QrFrameDefinition {
  return QR_FRAMES.find((frame) => frame.id === id) ?? QR_FRAMES[0]!;
}

export function normalizeFrameLabel(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_FRAME_LABEL;
  const trimmed = value.trim().slice(0, FRAME_LABEL_MAX);
  return trimmed || DEFAULT_FRAME_LABEL;
}

export function frameUsesLabel(id: QrFrameId): boolean {
  return getQrFrame(id).usesLabel;
}

export function frameLabelPlacement(id: QrFrameId): FrameLabelPlacement {
  switch (id) {
    case "banner-top":
    case "balloon-top":
      return "top";
    case "caption":
    case "pill":
    case "banner-bottom":
    case "balloon-bottom":
    case "ribbon-bottom":
      return "bottom";
    default:
      return "none";
  }
}

/** Layout metrics relative to the QR module canvas size (includes quiet zone). */
export type FrameLayout = {
  width: number;
  height: number;
  qrX: number;
  qrY: number;
  pad: number;
  captionHeight: number;
  radius: number;
};

function paddedSquare(s: number, padRatio: number, radiusRatio: number): FrameLayout {
  const pad = Math.round(s * padRatio);
  return {
    width: s + pad * 2,
    height: s + pad * 2,
    qrX: pad,
    qrY: pad,
    pad,
    captionHeight: 0,
    radius: Math.round(s * radiusRatio),
  };
}

function labeledLayout(
  s: number,
  opts: {
    padRatio: number;
    captionRatio: number;
    radiusRatio: number;
    placement: "top" | "bottom";
    extra?: number;
  },
): FrameLayout {
  const pad = Math.round(s * opts.padRatio);
  const captionHeight = Math.round(s * opts.captionRatio);
  const extra = opts.extra ?? 0;
  const width = s + pad * 2;
  const height = s + pad * 2 + captionHeight + extra;
  return {
    width,
    height,
    qrX: pad,
    qrY: opts.placement === "top" ? pad + captionHeight + extra : pad,
    pad,
    captionHeight,
    radius: Math.round(s * opts.radiusRatio),
  };
}

export function getFrameLayout(qrSize: number, frameId: QrFrameId): FrameLayout {
  const s = Math.max(1, qrSize);

  switch (frameId) {
    case "none":
      return { width: s, height: s, qrX: 0, qrY: 0, pad: 0, captionHeight: 0, radius: 0 };
    case "border":
      return paddedSquare(s, 0.07, 0.04);
    case "soft":
      return paddedSquare(s, 0.11, 0.06);
    case "badge":
      return paddedSquare(s, 0.13, 0.08);
    case "caption":
      return labeledLayout(s, {
        padRatio: 0.09,
        captionRatio: 0.18,
        radiusRatio: 0.045,
        placement: "bottom",
      });
    case "pill":
      return labeledLayout(s, {
        padRatio: 0.09,
        captionRatio: 0.2,
        radiusRatio: 0.06,
        placement: "bottom",
      });
    case "dashed":
      return paddedSquare(s, 0.1, 0.05);
    case "double":
      return paddedSquare(s, 0.12, 0.05);
    case "brackets":
      return paddedSquare(s, 0.1, 0);
    case "banner-bottom":
      return labeledLayout(s, {
        padRatio: 0.08,
        captionRatio: 0.22,
        radiusRatio: 0.04,
        placement: "bottom",
      });
    case "banner-top":
      return labeledLayout(s, {
        padRatio: 0.08,
        captionRatio: 0.22,
        radiusRatio: 0.04,
        placement: "top",
      });
    case "balloon-bottom":
      return labeledLayout(s, {
        padRatio: 0.08,
        captionRatio: 0.2,
        radiusRatio: 0.08,
        placement: "bottom",
        extra: Math.round(s * 0.06),
      });
    case "balloon-top":
      return labeledLayout(s, {
        padRatio: 0.08,
        captionRatio: 0.2,
        radiusRatio: 0.08,
        placement: "top",
        extra: Math.round(s * 0.06),
      });
    case "ribbon-bottom":
      return labeledLayout(s, {
        padRatio: 0.08,
        captionRatio: 0.24,
        radiusRatio: 0.03,
        placement: "bottom",
      });
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCaptionText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
) {
  const fontSize = Math.max(10, Math.round(height * 0.42));
  ctx.fillStyle = color;
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + width / 2, y + height / 2, width * 0.9);
}

function drawBannerBar(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    fg: string;
    bg: string;
    label: string;
    notch: "up" | "down" | "none";
  },
) {
  const { x, y, w, h, fg, bg, label, notch } = opts;
  const notchSize = Math.min(h * 0.45, w * 0.08);
  ctx.fillStyle = fg;
  ctx.beginPath();
  if (notch === "up") {
    ctx.moveTo(x, y + notchSize);
    ctx.lineTo(x + w / 2 - notchSize, y + notchSize);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w / 2 + notchSize, y + notchSize);
    ctx.lineTo(x + w, y + notchSize);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
  } else if (notch === "down") {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - notchSize);
    ctx.lineTo(x + w / 2 + notchSize, y + h - notchSize);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x + w / 2 - notchSize, y + h - notchSize);
    ctx.lineTo(x, y + h - notchSize);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.closePath();
  ctx.fill();
  const textPad = notch === "none" ? 0 : notchSize * 0.35;
  drawCaptionText(
    ctx,
    label,
    x,
    notch === "up" ? y + notchSize + textPad : y + textPad,
    w,
    h - (notch === "none" ? 0 : notchSize) - textPad,
    bg,
  );
}

function drawBalloon(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    pointer: number;
    fg: string;
    bg: string;
    label: string;
    placement: "top" | "bottom";
  },
) {
  const { x, y, w, h, pointer, fg, bg, label, placement } = opts;
  const bubbleY = placement === "bottom" ? y + pointer : y;
  const bubbleH = h - pointer;
  const r = Math.min(bubbleH / 2, w * 0.12);

  ctx.fillStyle = fg;
  roundRectPath(ctx, x, bubbleY, w, bubbleH, r);
  ctx.fill();

  ctx.beginPath();
  if (placement === "bottom") {
    ctx.moveTo(x + w / 2 - pointer, y + pointer);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w / 2 + pointer, y + pointer);
  } else {
    ctx.moveTo(x + w / 2 - pointer, y + bubbleH);
    ctx.lineTo(x + w / 2, y + h);
    ctx.lineTo(x + w / 2 + pointer, y + bubbleH);
  }
  ctx.closePath();
  ctx.fill();

  drawCaptionText(ctx, label, x, bubbleY, w, bubbleH, bg);
}

function drawRibbon(
  ctx: CanvasRenderingContext2D,
  opts: { x: number; y: number; w: number; h: number; fg: string; bg: string; label: string },
) {
  const { x, y, w, h, fg, bg, label } = opts;
  const fold = Math.min(h * 0.35, w * 0.08);
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(x + fold, y);
  ctx.lineTo(x + w - fold, y);
  ctx.lineTo(x + w, y + h / 2);
  ctx.lineTo(x + w - fold, y + h);
  ctx.lineTo(x + fold, y + h);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
  ctx.fill();

  // darker fold tips
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + fold, y);
  ctx.lineTo(x + fold, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w, y + h / 2);
  ctx.lineTo(x + w - fold, y);
  ctx.lineTo(x + w - fold, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  drawCaptionText(ctx, label, x + fold, y, w - fold * 2, h, bg);
}

/**
 * Paint a decorative frame around an existing QR canvas (which already includes quiet zone).
 * Returns a new canvas; does not mutate the source.
 */
export function composeFramedQrCanvas(
  source: HTMLCanvasElement,
  design: Pick<QrDesign, "fgColor" | "bgColor" | "frameId" | "frameLabel">,
): HTMLCanvasElement {
  const frameId = design.frameId;
  const layout = getFrameLayout(source.width, frameId);
  const out = document.createElement("canvas");
  out.width = layout.width;
  out.height = layout.height;
  const ctx = out.getContext("2d");
  if (!ctx) return source;

  const fg = design.fgColor;
  const bg = design.bgColor;
  const label = normalizeFrameLabel(design.frameLabel);
  const stroke = Math.max(1.5, Math.round(source.width * 0.012));

  // Background plate
  ctx.fillStyle = bg;
  if (frameId !== "none") {
    roundRectPath(ctx, 0, 0, layout.width, layout.height, layout.radius);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  ctx.drawImage(source, layout.qrX, layout.qrY);

  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (frameId) {
    case "none":
      break;
    case "border": {
      ctx.lineWidth = stroke;
      roundRectPath(
        ctx,
        stroke / 2,
        stroke / 2,
        layout.width - stroke,
        layout.height - stroke,
        layout.radius,
      );
      ctx.stroke();
      break;
    }
    case "soft": {
      ctx.lineWidth = stroke;
      ctx.globalAlpha = 0.55;
      roundRectPath(
        ctx,
        stroke / 2,
        stroke / 2,
        layout.width - stroke,
        layout.height - stroke,
        layout.radius,
      );
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case "badge": {
      ctx.lineWidth = stroke * 2.2;
      roundRectPath(
        ctx,
        stroke,
        stroke,
        layout.width - stroke * 2,
        layout.height - stroke * 2,
        layout.radius,
      );
      ctx.stroke();
      break;
    }
    case "caption": {
      ctx.lineWidth = stroke;
      roundRectPath(
        ctx,
        stroke / 2,
        stroke / 2,
        layout.width - stroke,
        layout.height - stroke,
        layout.radius,
      );
      ctx.stroke();
      const barY = layout.qrY + source.height + layout.pad * 0.25;
      ctx.fillStyle = fg;
      ctx.fillRect(0, barY, layout.width, layout.height - barY);
      ctx.fillRect(0, layout.height - layout.radius, layout.width, layout.radius);
      drawCaptionText(ctx, label, 0, barY, layout.width, layout.height - barY, bg);
      break;
    }
    case "pill": {
      ctx.lineWidth = stroke;
      roundRectPath(
        ctx,
        stroke / 2,
        stroke / 2,
        layout.width - stroke,
        layout.height - stroke,
        layout.radius,
      );
      ctx.stroke();
      const pillH = Math.round(layout.captionHeight * 0.72);
      const pillW = Math.round(layout.width * 0.72);
      const pillX = (layout.width - pillW) / 2;
      const pillY =
        layout.qrY + source.height + (layout.captionHeight - pillH) / 2 + layout.pad * 0.15;
      roundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fillStyle = fg;
      ctx.fill();
      drawCaptionText(ctx, label, pillX, pillY, pillW, pillH, bg);
      break;
    }
    case "dashed": {
      ctx.lineWidth = stroke;
      ctx.setLineDash([stroke * 2.5, stroke * 1.8]);
      roundRectPath(
        ctx,
        stroke / 2,
        stroke / 2,
        layout.width - stroke,
        layout.height - stroke,
        layout.radius,
      );
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case "double": {
      ctx.lineWidth = stroke;
      roundRectPath(
        ctx,
        stroke / 2,
        stroke / 2,
        layout.width - stroke,
        layout.height - stroke,
        layout.radius,
      );
      ctx.stroke();
      const inset = stroke * 3.2;
      roundRectPath(
        ctx,
        inset,
        inset,
        layout.width - inset * 2,
        layout.height - inset * 2,
        Math.max(0, layout.radius - inset * 0.4),
      );
      ctx.stroke();
      break;
    }
    case "brackets": {
      const len = Math.round(layout.pad * 0.85);
      const t = stroke * 1.4;
      ctx.lineWidth = t;
      const inset = Math.round(layout.pad * 0.35);
      const drawBracket = (x: number, y: number, dx: number, dy: number) => {
        ctx.beginPath();
        ctx.moveTo(x + dx * len, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + dy * len);
        ctx.stroke();
      };
      drawBracket(inset, inset, 1, 1);
      drawBracket(layout.width - inset, inset, -1, 1);
      drawBracket(inset, layout.height - inset, 1, -1);
      drawBracket(layout.width - inset, layout.height - inset, -1, -1);
      break;
    }
    case "banner-bottom": {
      ctx.lineWidth = stroke;
      roundRectPath(
        ctx,
        stroke / 2,
        stroke / 2,
        layout.width - stroke,
        layout.height - stroke,
        layout.radius,
      );
      ctx.stroke();
      drawBannerBar(ctx, {
        x: 0,
        y: layout.qrY + source.height,
        w: layout.width,
        h: layout.height - (layout.qrY + source.height),
        fg,
        bg,
        label,
        notch: "up",
      });
      break;
    }
    case "banner-top": {
      ctx.lineWidth = stroke;
      roundRectPath(
        ctx,
        stroke / 2,
        stroke / 2,
        layout.width - stroke,
        layout.height - stroke,
        layout.radius,
      );
      ctx.stroke();
      drawBannerBar(ctx, {
        x: 0,
        y: 0,
        w: layout.width,
        h: layout.qrY,
        fg,
        bg,
        label,
        notch: "down",
      });
      break;
    }
    case "balloon-bottom": {
      ctx.lineWidth = stroke;
      roundRectPath(
        ctx,
        stroke / 2,
        stroke / 2,
        layout.width - stroke,
        layout.qrY + source.height + layout.pad - stroke,
        layout.radius,
      );
      ctx.stroke();
      const areaY = layout.qrY + source.height;
      const areaH = layout.height - areaY;
      const pointer = Math.round(areaH * 0.28);
      drawBalloon(ctx, {
        x: layout.width * 0.08,
        y: areaY,
        w: layout.width * 0.84,
        h: areaH - layout.pad * 0.2,
        pointer,
        fg,
        bg,
        label,
        placement: "bottom",
      });
      break;
    }
    case "balloon-top": {
      ctx.lineWidth = stroke;
      roundRectPath(
        ctx,
        stroke / 2,
        layout.qrY - layout.pad + stroke / 2,
        layout.width - stroke,
        layout.height - (layout.qrY - layout.pad) - stroke,
        layout.radius,
      );
      ctx.stroke();
      const areaH = layout.qrY;
      const pointer = Math.round(areaH * 0.28);
      drawBalloon(ctx, {
        x: layout.width * 0.08,
        y: layout.pad * 0.2,
        w: layout.width * 0.84,
        h: areaH - layout.pad * 0.2,
        pointer,
        fg,
        bg,
        label,
        placement: "top",
      });
      break;
    }
    case "ribbon-bottom": {
      ctx.lineWidth = stroke;
      roundRectPath(
        ctx,
        stroke / 2,
        stroke / 2,
        layout.width - stroke,
        layout.qrY + source.height + layout.pad - stroke,
        layout.radius,
      );
      ctx.stroke();
      const ribbonH = Math.round(layout.captionHeight * 0.78);
      const ribbonY =
        layout.qrY + source.height + (layout.captionHeight - ribbonH) / 2 + layout.pad * 0.1;
      drawRibbon(ctx, {
        x: layout.width * 0.06,
        y: ribbonY,
        w: layout.width * 0.88,
        h: ribbonH,
        fg,
        bg,
        label,
      });
      break;
    }
  }

  return out;
}
