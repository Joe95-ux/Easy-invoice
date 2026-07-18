"use client";

import { cn } from "@/lib/utils";

type QrScanOverlayProps = {
  open: boolean;
  label?: string;
  className?: string;
};

/** Full-page dimmed overlay with an animated QR “scan” loader in the center. */
export function QrScanOverlay({
  open,
  label = "Creating QR code…",
  className,
}: QrScanOverlayProps) {
  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/75 backdrop-blur-[2px]",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-5 px-6">
        <div
          className="relative size-[148px] overflow-hidden p-3 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
          aria-hidden
        >
          <QrLoaderGraphic className="size-full text-foreground" />
          <span className="qr-scan-line pointer-events-none absolute inset-x-3 h-0.5 rounded-full bg-primary shadow-[0_0_12px_2px] shadow-primary/50" />
          <span className="pointer-events-none absolute inset-3 rounded-lg ring-1 ring-primary/25" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">This only takes a moment</p>
        </div>
      </div>
    </div>
  );
}

function QrLoaderGraphic({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor">
      {/* Finder eyes */}
      <FinderEye x={4} y={4} />
      <FinderEye x={68} y={4} />
      <FinderEye x={4} y={68} />

      {/* Timing / alignment dots */}
      <rect x={72} y={72} width={8} height={8} rx={1.5} />
      <rect x={84} y={72} width={8} height={8} rx={1.5} />
      <rect x={72} y={84} width={8} height={8} rx={1.5} />

      {/* Data modules — staggered opacity for a “live” feel */}
      <g className="qr-loader-modules">
        <rect x={36} y={8} width={6} height={6} rx={1} opacity="0.9" />
        <rect x={46} y={8} width={6} height={6} rx={1} opacity="0.45" />
        <rect x={56} y={8} width={6} height={6} rx={1} opacity="0.85" />
        <rect x={36} y={18} width={6} height={6} rx={1} opacity="0.55" />
        <rect x={46} y={18} width={6} height={6} rx={1} opacity="0.95" />
        <rect x={56} y={18} width={6} height={6} rx={1} opacity="0.4" />
        <rect x={36} y={28} width={6} height={6} rx={1} opacity="0.8" />
        <rect x={56} y={28} width={6} height={6} rx={1} opacity="0.7" />

        <rect x={8} y={36} width={6} height={6} rx={1} opacity="0.5" />
        <rect x={18} y={36} width={6} height={6} rx={1} opacity="0.9" />
        <rect x={28} y={36} width={6} height={6} rx={1} opacity="0.35" />
        <rect x={38} y={36} width={6} height={6} rx={1} opacity="0.85" />
        <rect x={48} y={36} width={6} height={6} rx={1} opacity="0.6" />
        <rect x={58} y={36} width={6} height={6} rx={1} opacity="0.95" />
        <rect x={68} y={36} width={6} height={6} rx={1} opacity="0.4" />
        <rect x={78} y={36} width={6} height={6} rx={1} opacity="0.75" />
        <rect x={88} y={36} width={6} height={6} rx={1} opacity="0.55" />

        <rect x={8} y={46} width={6} height={6} rx={1} opacity="0.85" />
        <rect x={28} y={46} width={6} height={6} rx={1} opacity="0.5" />
        <rect x={38} y={46} width={6} height={6} rx={1} opacity="0.95" />
        <rect x={48} y={46} width={6} height={6} rx={1} opacity="0.35" />
        <rect x={68} y={46} width={6} height={6} rx={1} opacity="0.8" />
        <rect x={88} y={46} width={6} height={6} rx={1} opacity="0.65" />

        <rect x={8} y={56} width={6} height={6} rx={1} opacity="0.4" />
        <rect x={18} y={56} width={6} height={6} rx={1} opacity="0.9" />
        <rect x={38} y={56} width={6} height={6} rx={1} opacity="0.55" />
        <rect x={48} y={56} width={6} height={6} rx={1} opacity="0.85" />
        <rect x={58} y={56} width={6} height={6} rx={1} opacity="0.45" />
        <rect x={78} y={56} width={6} height={6} rx={1} opacity="0.95" />
        <rect x={88} y={56} width={6} height={6} rx={1} opacity="0.5" />

        <rect x={36} y={68} width={6} height={6} rx={1} opacity="0.75" />
        <rect x={46} y={68} width={6} height={6} rx={1} opacity="0.4" />
        <rect x={56} y={68} width={6} height={6} rx={1} opacity="0.9" />
        <rect x={36} y={78} width={6} height={6} rx={1} opacity="0.55" />
        <rect x={46} y={78} width={6} height={6} rx={1} opacity="0.85" />
        <rect x={56} y={88} width={6} height={6} rx={1} opacity="0.7" />
        <rect x={46} y={88} width={6} height={6} rx={1} opacity="0.45" />
      </g>
    </svg>
  );
}

function FinderEye({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={28} height={28} rx={3} fill="none" stroke="currentColor" strokeWidth="4" />
      <rect x={8} y={8} width={12} height={12} rx={1.5} />
    </g>
  );
}
