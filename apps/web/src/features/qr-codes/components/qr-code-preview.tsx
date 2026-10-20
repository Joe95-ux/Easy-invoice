"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { createRoot } from "react-dom/client";
import { QRCode } from "react-qrcode-logo";
import { QrFrameShell } from "@/features/qr-codes/components/qr-frame-shell";
import { composeFramedQrCanvas } from "@/lib/qr-codes/frames";
import { exportQrCanvas } from "@/lib/qr-codes/export";
import type { QrDesign } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";

/** Default PNG export size so list/edit downloads are print-ready, not thumbnail-sized. */
export const QR_PRINT_SIZE = 1024;

export type QrCodePreviewHandle = {
  download: (fileName: string) => void;
  /** Framed canvas when a decorative frame is set; otherwise the raw QR canvas. */
  getCanvas: () => HTMLCanvasElement | null;
};

type QrCodePreviewProps = {
  value: string;
  design: QrDesign;
  logoUrl?: string | null;
  size?: number;
  /** Soft UI chrome (shadow/ring) around the preview — not the decorative QR frame. */
  chrome?: boolean;
  className?: string;
};

export const QrCodePreview = forwardRef<QrCodePreviewHandle, QrCodePreviewProps>(
  function QrCodePreview(
    { value, design, logoUrl, size = 220, chrome = true, className },
    ref,
  ) {
    const qrRef = useRef<QRCode>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const quietZone = Math.round(size * 0.05);

    function getSourceCanvas(): HTMLCanvasElement | null {
      return containerRef.current?.querySelector("canvas") ?? null;
    }

    function getFramedCanvas(): HTMLCanvasElement | null {
      const source = getSourceCanvas();
      if (!source) return null;
      if (design.frameId === "none") return source;
      return composeFramedQrCanvas(source, design);
    }

    useImperativeHandle(ref, () => ({
      download: (fileName: string) => {
        const canvas = getFramedCanvas();
        if (!canvas) {
          qrRef.current?.download("png", fileName);
          return;
        }
        exportQrCanvas(canvas, "png", fileName.replace(/\.png$/i, ""));
      },
      getCanvas: () => getFramedCanvas(),
    }));

    const useLogo = design.logoEnabled && Boolean(logoUrl);
    const eyeRadiusPx = Math.round((design.eyeRadius / 50) * (size * 0.12));

    return (
      <div
        ref={containerRef}
        className={cn(
          "inline-flex items-center justify-center overflow-hidden",
          chrome ? "rounded-xl p-3 shadow-sm ring-1 ring-border/60" : "rounded-md",
          className,
        )}
        style={{ backgroundColor: design.bgColor }}
      >
        <QrFrameShell design={design} qrSize={size} quietZone={quietZone}>
          <QRCode
            ref={qrRef}
            value={value || " "}
            size={size}
            quietZone={quietZone}
            bgColor={design.bgColor}
            fgColor={design.fgColor}
            qrStyle={design.dotStyle}
            eyeRadius={eyeRadiusPx}
            ecLevel={useLogo ? "H" : "M"}
            enableCORS
            logoImage={useLogo ? (logoUrl ?? undefined) : undefined}
            logoWidth={useLogo ? Math.round(size * 0.22) : undefined}
            logoHeight={useLogo ? Math.round(size * 0.22) : undefined}
            logoPadding={useLogo ? 3 : undefined}
            logoPaddingStyle="square"
            removeQrCodeBehindLogo={useLogo}
          />
        </QrFrameShell>
      </div>
    );
  },
);

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** Render a full-size QR off-screen and download it, independent of the on-page thumbnail. */
export async function downloadQrPng(options: {
  value: string;
  design: QrDesign;
  logoUrl?: string | null;
  fileName: string;
  size?: number;
}): Promise<void> {
  if (typeof document === "undefined") return;

  const size = options.size ?? QR_PRINT_SIZE;
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-10000px;top:0;pointer-events:none";
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    const handle = await new Promise<QrCodePreviewHandle>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("QR code is not ready yet")), 8000);
      root.render(
        <QrCodePreview
          ref={(next) => {
            if (!next) return;
            const wait = () => {
              if (next.getCanvas()) {
                window.clearTimeout(timeout);
                resolve(next);
                return;
              }
              requestAnimationFrame(wait);
            };
            wait();
          }}
          value={options.value}
          design={options.design}
          logoUrl={options.logoUrl}
          size={size}
          chrome={false}
        />,
      );
    });
    await waitForPaint();
    if (options.logoUrl) {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    handle.download(options.fileName);
  } finally {
    root.unmount();
    host.remove();
  }
}
