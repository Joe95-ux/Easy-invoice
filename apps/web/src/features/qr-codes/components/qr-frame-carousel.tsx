"use client";

import { useMemo } from "react";
import { CheckIcon } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { QR_FRAMES, getFrameLayout, type QrFrameDefinition } from "@/lib/qr-codes/frames";
import type { QrDesign, QrFrameId } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type QrFrameCarouselProps = {
  design: QrDesign;
  value: QrFrameId;
  onChange: (frameId: QrFrameId) => void;
};

function FrameThumb({
  frame,
  design,
  selected,
}: {
  frame: QrFrameDefinition;
  design: QrDesign;
  selected: boolean;
}) {
  const fg = design.fgColor;
  const bg = design.bgColor;
  // Tiny fake QR for the thumb
  const qr = 56;
  const quiet = 4;
  const canvas = qr + quiet * 2;
  const layout = getFrameLayout(canvas, frame.id);
  const scale = 72 / Math.max(layout.width, layout.height);

  return (
    <div
      className={cn(
        "flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-muted/40",
        selected ? "border-primary" : "border-border/70",
      )}
    >
      <div
        style={{
          width: layout.width,
          height: layout.height,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <MiniFrame frameId={frame.id} fg={fg} bg={bg} qr={canvas} layout={layout} />
      </div>
    </div>
  );
}

function MiniFrame({
  frameId,
  fg,
  bg,
  qr,
  layout,
}: {
  frameId: QrFrameId;
  fg: string;
  bg: string;
  qr: number;
  layout: ReturnType<typeof getFrameLayout>;
}) {
  const stroke = Math.max(1, qr * 0.03);
  const modules = (
    <div
      className="grid grid-cols-5 gap-px"
      style={{
        width: qr * 0.7,
        height: qr * 0.7,
        margin: qr * 0.15,
        backgroundColor: bg,
      }}
    >
      {Array.from({ length: 25 }, (_, i) => (
        <span
          key={i}
          style={{
            backgroundColor:
              [0, 1, 2, 4, 5, 6, 10, 12, 14, 18, 20, 21, 22, 24].includes(i) ? fg : bg,
          }}
        />
      ))}
    </div>
  );

  if (frameId === "none") {
    return (
      <div style={{ width: layout.width, height: layout.height, backgroundColor: bg }}>
        {modules}
      </div>
    );
  }

  const radius = frameId === "circle" ? "50%" : layout.radius;
  const boxShadow =
    frameId === "soft"
      ? `inset 0 0 0 ${stroke}px color-mix(in srgb, ${fg} 55%, transparent)`
      : frameId === "badge"
        ? `inset 0 0 0 ${stroke * 2}px ${fg}`
        : frameId === "double"
          ? `inset 0 0 0 ${stroke}px ${fg}, inset 0 0 0 ${stroke * 3.5}px ${bg}, inset 0 0 0 ${stroke * 4.5}px ${fg}`
          : frameId === "circle" ||
              frameId === "border" ||
              frameId === "caption" ||
              frameId === "pill"
            ? `inset 0 0 0 ${stroke}px ${fg}`
            : undefined;

  return (
    <div
      style={{
        width: layout.width,
        height: layout.height,
        backgroundColor: bg,
        borderRadius: radius,
        boxShadow,
        outline: frameId === "dashed" ? `${stroke}px dashed ${fg}` : undefined,
        outlineOffset: frameId === "dashed" ? -stroke : undefined,
        position: "relative",
        overflow: "hidden",
        padding: layout.pad,
        paddingBottom: layout.pad + layout.captionHeight,
        boxSizing: "border-box",
      }}
    >
      <div className="relative" style={{ width: qr, height: qr }}>
        {modules}
        {frameId === "brackets" && (
          <>
            <span
              className="absolute"
              style={{
                top: 0,
                left: 0,
                width: 10,
                height: 10,
                borderColor: fg,
                borderStyle: "solid",
                borderWidth: "2px 0 0 2px",
              }}
            />
            <span
              className="absolute"
              style={{
                top: 0,
                right: 0,
                width: 10,
                height: 10,
                borderColor: fg,
                borderStyle: "solid",
                borderWidth: "2px 2px 0 0",
              }}
            />
            <span
              className="absolute"
              style={{
                bottom: 0,
                left: 0,
                width: 10,
                height: 10,
                borderColor: fg,
                borderStyle: "solid",
                borderWidth: "0 0 2px 2px",
              }}
            />
            <span
              className="absolute"
              style={{
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                borderColor: fg,
                borderStyle: "solid",
                borderWidth: "0 2px 2px 0",
              }}
            />
          </>
        )}
      </div>
      {(frameId === "caption" || frameId === "pill") && (
        <div
          className="absolute inset-x-1 flex items-center justify-center"
          style={{
            bottom: 2,
            height: Math.max(10, layout.captionHeight * 0.7),
            backgroundColor: frameId === "caption" ? fg : undefined,
          }}
        >
          <span
            style={{
              backgroundColor: frameId === "pill" ? fg : undefined,
              color: bg,
              borderRadius: frameId === "pill" ? 999 : 0,
              fontSize: 7,
              fontWeight: 700,
              padding: frameId === "pill" ? "1px 6px" : 0,
            }}
          >
            SCAN
          </span>
        </div>
      )}
    </div>
  );
}

export function QrFrameCarousel({ design, value, onChange }: QrFrameCarouselProps) {
  const isMobile = useIsMobile();
  const ordered = useMemo(() => {
    const selectedIndex = QR_FRAMES.findIndex((frame) => frame.id === value);
    if (selectedIndex <= 0) return QR_FRAMES;
    const selected = QR_FRAMES[selectedIndex]!;
    return [selected, ...QR_FRAMES.slice(0, selectedIndex), ...QR_FRAMES.slice(selectedIndex + 1)];
  }, [value]);

  return (
    <Carousel
      key={value}
      opts={{ loop: false, align: "start", containScroll: "trimSnaps" }}
    >
      <div className="mb-2 flex items-center justify-end gap-1.5">
        <CarouselPrevious className="static size-7 translate-x-0 translate-y-0" />
        <CarouselNext className="static size-7 translate-x-0 translate-y-0" />
      </div>
      <CarouselContent className="-ml-2">
        {ordered.map((frame) => {
          const selected = frame.id === value;
          return (
            <CarouselItem
              key={frame.id}
              className={cn("pl-2", isMobile ? "basis-1/2" : "basis-1/3 sm:basis-1/4")}
            >
              <button
                type="button"
                onClick={() => onChange(frame.id)}
                aria-pressed={selected}
                className={cn(
                  "group relative w-full cursor-pointer overflow-hidden rounded-xl border bg-card text-left transition-colors",
                  selected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-foreground/20",
                )}
              >
                <FrameThumb frame={frame} design={design} selected={selected} />
                {selected && (
                  <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <CheckIcon className="size-3" />
                  </span>
                )}
                <div className="px-2 py-1.5">
                  <p className="truncate text-xs font-medium text-foreground">{frame.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{frame.description}</p>
                </div>
              </button>
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
}
