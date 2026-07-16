"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { QRCode } from "react-qrcode-logo";
import { cn } from "@/lib/utils";
import type { QrDesign } from "@/lib/qr-codes/types";

export type QrCodePreviewHandle = {
  download: (fileName: string) => void;
};

type QrCodePreviewProps = {
  value: string;
  design: QrDesign;
  logoUrl?: string | null;
  size?: number;
  frame?: boolean;
  className?: string;
};

export const QrCodePreview = forwardRef<QrCodePreviewHandle, QrCodePreviewProps>(
  function QrCodePreview({ value, design, logoUrl, size = 220, frame = true, className }, ref) {
    const qrRef = useRef<QRCode>(null);

    useImperativeHandle(ref, () => ({
      download: (fileName: string) => qrRef.current?.download("png", fileName),
    }));

    const useLogo = design.logoEnabled && Boolean(logoUrl);
    const eyeRadiusPx = Math.round((design.eyeRadius / 50) * (size * 0.12));

    return (
      <div
        className={cn(
          "inline-flex items-center justify-center overflow-hidden",
          frame ? "rounded-xl p-3 shadow-sm ring-1 ring-border/60" : "rounded-md",
          className,
        )}
        style={{ backgroundColor: design.bgColor }}
      >
        <QRCode
          ref={qrRef}
          value={value || " "}
          size={size}
          quietZone={Math.round(size * 0.05)}
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
      </div>
    );
  },
);
