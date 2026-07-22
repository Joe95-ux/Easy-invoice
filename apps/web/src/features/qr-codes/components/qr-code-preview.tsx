"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { QRCode } from "react-qrcode-logo";
import { QrFrameShell } from "@/features/qr-codes/components/qr-frame-shell";
import { composeFramedQrCanvas } from "@/lib/qr-codes/frames";
import { exportQrCanvas } from "@/lib/qr-codes/export";
import type { QrDesign } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";

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
