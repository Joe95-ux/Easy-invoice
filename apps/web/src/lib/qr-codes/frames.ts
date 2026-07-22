import type { QrDesign, QrFrameId } from "@/lib/qr-codes/types";

export type QrFrameDefinition = {
  id: QrFrameId;
  name: string;
  description: string;
  /** Shows the optional caption input when selected. */
  usesLabel: boolean;
};

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
  { id: "circle", name: "Circle", description: "Round stamp", usesLabel: false },
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

/** Layout metrics relative to the QR module canvas size (includes quiet zone). */
export type FrameLayout = {
  /** Total output width. */
  width: number;
  /** Total output height. */
  height: number;
  /** Top-left of the QR inside the output. */
  qrX: number;
  qrY: number;
  pad: number;
  captionHeight: number;
  radius: number;
};

export function getFrameLayout(qrSize: number, frameId: QrFrameId): FrameLayout {
  const s = Math.max(1, qrSize);

  switch (frameId) {
    case "none":
      return { width: s, height: s, qrX: 0, qrY: 0, pad: 0, captionHeight: 0, radius: 0 };
    case "border": {
      const pad = Math.round(s * 0.07);
      return {
        width: s + pad * 2,
        height: s + pad * 2,
        qrX: pad,
        qrY: pad,
        pad,
        captionHeight: 0,
        radius: Math.round(s * 0.04),
      };
    }
    case "soft": {
      const pad = Math.round(s * 0.11);
      return {
        width: s + pad * 2,
        height: s + pad * 2,
        qrX: pad,
        qrY: pad,
        pad,
        captionHeight: 0,
        radius: Math.round(s * 0.06),
      };
    }
    case "badge": {
      const pad = Math.round(s * 0.13);
      return {
        width: s + pad * 2,
        height: s + pad * 2,
        qrX: pad,
        qrY: pad,
        pad,
        captionHeight: 0,
        radius: Math.round(s * 0.08),
      };
    }
    case "caption": {
      const pad = Math.round(s * 0.09);
      const captionHeight = Math.round(s * 0.18);
      return {
        width: s + pad * 2,
        height: s + pad * 2 + captionHeight,
        qrX: pad,
        qrY: pad,
        pad,
        captionHeight,
        radius: Math.round(s * 0.045),
      };
    }
    case "pill": {
      const pad = Math.round(s * 0.09);
      const captionHeight = Math.round(s * 0.2);
      return {
        width: s + pad * 2,
        height: s + pad * 2 + captionHeight,
        qrX: pad,
        qrY: pad,
        pad,
        captionHeight,
        radius: Math.round(s * 0.06),
      };
    }
    case "dashed": {
      const pad = Math.round(s * 0.1);
      return {
        width: s + pad * 2,
        height: s + pad * 2,
        qrX: pad,
        qrY: pad,
        pad,
        captionHeight: 0,
        radius: Math.round(s * 0.05),
      };
    }
    case "double": {
      const pad = Math.round(s * 0.12);
      return {
        width: s + pad * 2,
        height: s + pad * 2,
        qrX: pad,
        qrY: pad,
        pad,
        captionHeight: 0,
        radius: Math.round(s * 0.05),
      };
    }
    case "brackets": {
      const pad = Math.round(s * 0.1);
      return {
        width: s + pad * 2,
        height: s + pad * 2,
        qrX: pad,
        qrY: pad,
        pad,
        captionHeight: 0,
        radius: 0,
      };
    }
    case "circle": {
      const pad = Math.round(s * 0.14);
      const diameter = s + pad * 2;
      return {
        width: diameter,
        height: diameter,
        qrX: pad,
        qrY: pad,
        pad,
        captionHeight: 0,
        radius: diameter / 2,
      };
    }
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

  ctx.fillStyle = bg;
  if (frameId === "circle") {
    ctx.beginPath();
    ctx.arc(layout.width / 2, layout.height / 2, layout.width / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (frameId !== "none") {
    roundRectPath(ctx, 0, 0, layout.width, layout.height, layout.radius);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  ctx.drawImage(source, layout.qrX, layout.qrY);

  const stroke = Math.max(1.5, Math.round(source.width * 0.012));
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
      // square off bottom of rounded rect by redrawing bottom corners filled
      ctx.fillRect(0, layout.height - layout.radius, layout.width, layout.radius);
      drawCaptionText(
        ctx,
        label,
        0,
        barY,
        layout.width,
        layout.height - barY,
        bg,
      );
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
      const pillY = layout.qrY + source.height + (layout.captionHeight - pillH) / 2 + layout.pad * 0.15;
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
    case "circle": {
      ctx.lineWidth = stroke * 1.6;
      ctx.beginPath();
      ctx.arc(
        layout.width / 2,
        layout.height / 2,
        layout.width / 2 - stroke,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      break;
    }
  }

  return out;
}
