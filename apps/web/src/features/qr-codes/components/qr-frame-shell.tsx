"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  frameUsesLabel,
  getFrameLayout,
  normalizeFrameLabel,
} from "@/lib/qr-codes/frames";
import type { QrDesign } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";

type QrFrameShellProps = {
  design: QrDesign;
  /** QR module size in px (QRCode `size` prop). */
  qrSize: number;
  /** Quiet zone in px on each side (QRCode `quietZone`). */
  quietZone: number;
  children: ReactNode;
  className?: string;
};

/**
 * Decorative CSS frame around a live QR. Layout mirrors `composeFramedQrCanvas`
 * using the full canvas size (qrSize + 2 * quietZone).
 */
export function QrFrameShell({
  design,
  qrSize,
  quietZone,
  children,
  className,
}: QrFrameShellProps) {
  const canvasSize = qrSize + quietZone * 2;
  const layout = getFrameLayout(canvasSize, design.frameId);
  const stroke = Math.max(1.5, canvasSize * 0.012);
  const fg = design.fgColor;
  const bg = design.bgColor;
  const label = normalizeFrameLabel(design.frameLabel);
  const id = design.frameId;

  if (id === "none") {
    return (
      <div className={cn("inline-flex", className)} style={{ backgroundColor: bg }}>
        {children}
      </div>
    );
  }

  const shellStyle: CSSProperties = {
    backgroundColor: bg,
    color: fg,
    boxSizing: "border-box",
    position: "relative",
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: layout.pad,
    paddingLeft: layout.pad,
    paddingRight: layout.pad,
    paddingBottom: layout.pad + (frameUsesLabel(id) ? layout.captionHeight : 0),
    borderRadius: id === "circle" ? "50%" : layout.radius,
    overflow: "hidden",
    ...(id === "circle"
      ? { width: layout.width, height: layout.height, justifyContent: "center" }
      : {}),
  };

  const borderStyle: CSSProperties =
    id === "border" || id === "soft" || id === "caption" || id === "pill"
      ? {
          boxShadow:
            id === "soft"
              ? `inset 0 0 0 ${stroke}px color-mix(in srgb, ${fg} 55%, transparent)`
              : `inset 0 0 0 ${stroke}px ${fg}`,
        }
      : id === "badge"
        ? { boxShadow: `inset 0 0 0 ${stroke * 2.2}px ${fg}` }
        : id === "dashed"
          ? {
              outline: `${stroke}px dashed ${fg}`,
              outlineOffset: `-${stroke}px`,
            }
          : id === "double"
            ? {
                boxShadow: `inset 0 0 0 ${stroke}px ${fg}, inset 0 0 0 ${stroke * 4.2}px ${bg}, inset 0 0 0 ${stroke * 5.2}px ${fg}`,
              }
            : id === "circle"
              ? { boxShadow: `inset 0 0 0 ${stroke * 1.6}px ${fg}` }
              : {};

  return (
    <div className={cn("inline-flex", className)} style={{ ...shellStyle, ...borderStyle }}>
      <div className="relative shrink-0 leading-none [&>canvas]:block [&_canvas]:block">
        {children}
        {id === "brackets" && (
          <BracketMarks color={fg} stroke={stroke} pad={layout.pad} />
        )}
      </div>

      {id === "caption" && (
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-center px-2"
          style={{
            height: layout.captionHeight + layout.pad * 0.35,
            backgroundColor: fg,
            color: bg,
            fontSize: Math.max(10, layout.captionHeight * 0.42),
            fontWeight: 600,
          }}
        >
          <span className="truncate">{label}</span>
        </div>
      )}

      {id === "pill" && (
        <div
          className="absolute inset-x-0 flex justify-center px-2"
          style={{
            bottom: layout.pad * 0.35,
            height: layout.captionHeight,
          }}
        >
          <span
            className="flex max-w-[72%] items-center justify-center truncate px-3"
            style={{
              backgroundColor: fg,
              color: bg,
              borderRadius: 999,
              height: layout.captionHeight * 0.72,
              fontSize: Math.max(10, layout.captionHeight * 0.32),
              fontWeight: 600,
            }}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

function BracketMarks({
  color,
  stroke,
  pad,
}: {
  color: string;
  stroke: number;
  pad: number;
}) {
  const len = Math.max(8, pad * 0.85);
  const t = Math.max(2, stroke * 1.4);
  const inset = Math.max(2, pad * 0.15);

  const arm = (style: CSSProperties) => (
    <span
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        width: len,
        height: len,
        borderColor: color,
        borderStyle: "solid",
        ...style,
      }}
    />
  );

  return (
    <>
      {arm({
        top: -inset,
        left: -inset,
        borderWidth: `${t}px 0 0 ${t}px`,
      })}
      {arm({
        top: -inset,
        right: -inset,
        borderWidth: `${t}px ${t}px 0 0`,
      })}
      {arm({
        bottom: -inset,
        left: -inset,
        borderWidth: `0 0 ${t}px ${t}px`,
      })}
      {arm({
        bottom: -inset,
        right: -inset,
        borderWidth: `0 ${t}px ${t}px 0`,
      })}
    </>
  );
}
