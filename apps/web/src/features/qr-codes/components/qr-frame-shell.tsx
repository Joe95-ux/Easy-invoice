"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  frameLabelPlacement,
  getFrameLayout,
  normalizeFrameLabel,
} from "@/lib/qr-codes/frames";
import type { QrDesign } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";

type QrFrameShellProps = {
  design: QrDesign;
  qrSize: number;
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
  const placement = frameLabelPlacement(id);

  if (id === "none") {
    return (
      <div className={cn("inline-flex", className)} style={{ backgroundColor: bg }}>
        {children}
      </div>
    );
  }

  const topCaption = placement === "top" ? layout.captionHeight : 0;
  const bottomCaption = placement === "bottom" ? layout.captionHeight : 0;
  // balloon layouts include extra in height beyond captionHeight
  const extraBottom =
    id === "balloon-bottom"
      ? Math.max(0, layout.height - (canvasSize + layout.pad * 2 + layout.captionHeight))
      : 0;
  const extraTop =
    id === "balloon-top"
      ? Math.max(0, layout.height - (canvasSize + layout.pad * 2 + layout.captionHeight))
      : 0;

  const shellStyle: CSSProperties = {
    backgroundColor: bg,
    color: fg,
    boxSizing: "border-box",
    position: "relative",
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: layout.pad + topCaption + extraTop,
    paddingLeft: layout.pad,
    paddingRight: layout.pad,
    paddingBottom: layout.pad + bottomCaption + extraBottom,
    borderRadius: layout.radius,
    overflow: "hidden",
  };

  const borderStyle: CSSProperties =
    id === "border" ||
    id === "soft" ||
    id === "caption" ||
    id === "pill" ||
    id === "banner-bottom" ||
    id === "banner-top" ||
    id === "ribbon-bottom" ||
    id === "balloon-bottom" ||
    id === "balloon-top"
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
            : {};

  return (
    <div className={cn("inline-flex", className)} style={{ ...shellStyle, ...borderStyle }}>
      {id === "banner-top" && (
        <BannerLabel
          label={label}
          fg={fg}
          bg={bg}
          height={layout.captionHeight}
          notch="down"
          style={{ top: 0, left: 0, right: 0 }}
        />
      )}
      {id === "balloon-top" && (
        <BalloonLabel
          label={label}
          fg={fg}
          bg={bg}
          height={layout.captionHeight}
          placement="top"
          style={{ top: layout.pad * 0.2, left: "8%", right: "8%" }}
        />
      )}

      <div className="relative shrink-0 leading-none [&>canvas]:block [&_canvas]:block">
        {children}
        {id === "brackets" && (
          <BracketMarks color={fg} stroke={stroke} pad={layout.pad} />
        )}
      </div>

      {id === "caption" && (
        <BarLabel
          label={label}
          fg={fg}
          bg={bg}
          height={layout.captionHeight + layout.pad * 0.35}
          style={{ bottom: 0, left: 0, right: 0 }}
        />
      )}
      {id === "pill" && (
        <PillLabel
          label={label}
          fg={fg}
          bg={bg}
          height={layout.captionHeight}
          style={{ bottom: layout.pad * 0.35, left: 0, right: 0 }}
        />
      )}
      {id === "banner-bottom" && (
        <BannerLabel
          label={label}
          fg={fg}
          bg={bg}
          height={layout.captionHeight}
          notch="up"
          style={{ bottom: 0, left: 0, right: 0 }}
        />
      )}
      {id === "balloon-bottom" && (
        <BalloonLabel
          label={label}
          fg={fg}
          bg={bg}
          height={layout.captionHeight}
          placement="bottom"
          style={{ bottom: layout.pad * 0.15, left: "8%", right: "8%" }}
        />
      )}
      {id === "ribbon-bottom" && (
        <RibbonLabel
          label={label}
          fg={fg}
          bg={bg}
          height={layout.captionHeight * 0.78}
          style={{ bottom: layout.pad * 0.35, left: "6%", right: "6%" }}
        />
      )}
    </div>
  );
}

function BarLabel({
  label,
  fg,
  bg,
  height,
  style,
}: {
  label: string;
  fg: string;
  bg: string;
  height: number;
  style: CSSProperties;
}) {
  return (
    <div
      className="absolute flex items-center justify-center px-2"
      style={{
        ...style,
        height,
        backgroundColor: fg,
        color: bg,
        fontSize: Math.max(10, height * 0.42),
        fontWeight: 600,
      }}
    >
      <span className="truncate">{label}</span>
    </div>
  );
}

function PillLabel({
  label,
  fg,
  bg,
  height,
  style,
}: {
  label: string;
  fg: string;
  bg: string;
  height: number;
  style: CSSProperties;
}) {
  return (
    <div className="absolute flex justify-center px-2" style={{ ...style, height }}>
      <span
        className="flex max-w-[72%] items-center justify-center truncate px-3"
        style={{
          backgroundColor: fg,
          color: bg,
          borderRadius: 999,
          height: height * 0.72,
          fontSize: Math.max(10, height * 0.32),
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function BannerLabel({
  label,
  fg,
  bg,
  height,
  notch,
  style,
}: {
  label: string;
  fg: string;
  bg: string;
  height: number;
  notch: "up" | "down";
  style: CSSProperties;
}) {
  const clip =
    notch === "up"
      ? "polygon(0 28%, 42% 28%, 50% 0, 58% 28%, 100% 28%, 100% 100%, 0 100%)"
      : "polygon(0 0, 100% 0, 100% 72%, 58% 72%, 50% 100%, 42% 72%, 0 72%)";

  return (
    <div
      className="absolute flex items-center justify-center px-2"
      style={{
        ...style,
        height,
        backgroundColor: fg,
        color: bg,
        clipPath: clip,
        fontSize: Math.max(10, height * 0.36),
        fontWeight: 700,
        letterSpacing: "0.02em",
        paddingTop: notch === "up" ? height * 0.12 : 0,
        paddingBottom: notch === "down" ? height * 0.12 : 0,
      }}
    >
      <span className="truncate uppercase">{label}</span>
    </div>
  );
}

function BalloonLabel({
  label,
  fg,
  bg,
  height,
  placement,
  style,
}: {
  label: string;
  fg: string;
  bg: string;
  height: number;
  placement: "top" | "bottom";
  style: CSSProperties;
}) {
  return (
    <div className="absolute flex justify-center" style={style}>
      <div className="relative w-full max-w-full">
        <div
          className="flex items-center justify-center truncate px-3"
          style={{
            backgroundColor: fg,
            color: bg,
            borderRadius: height * 0.35,
            height,
            fontSize: Math.max(10, height * 0.38),
            fontWeight: 700,
          }}
        >
          <span className="truncate">{label}</span>
        </div>
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: `${height * 0.22}px solid transparent`,
            borderRight: `${height * 0.22}px solid transparent`,
            ...(placement === "bottom"
              ? {
                  top: -height * 0.28,
                  borderBottom: `${height * 0.3}px solid ${fg}`,
                }
              : {
                  bottom: -height * 0.28,
                  borderTop: `${height * 0.3}px solid ${fg}`,
                }),
          }}
        />
      </div>
    </div>
  );
}

function RibbonLabel({
  label,
  fg,
  bg,
  height,
  style,
}: {
  label: string;
  fg: string;
  bg: string;
  height: number;
  style: CSSProperties;
}) {
  return (
    <div
      className="absolute flex items-center justify-center px-4"
      style={{
        ...style,
        height,
        backgroundColor: fg,
        color: bg,
        clipPath:
          "polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%)",
        fontSize: Math.max(10, height * 0.4),
        fontWeight: 700,
      }}
    >
      <span className="truncate">{label}</span>
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
