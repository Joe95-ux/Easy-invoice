"use client";

import { CheckIcon } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { QrCodePreview } from "@/features/qr-codes/components/qr-code-preview";
import { QR_FRAMES, getFrameLayout } from "@/lib/qr-codes/frames";
import type { QrDesign, QrFrameId } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/** Stable payload so every thumb encodes the same code. */
const FRAME_THUMB_VALUE = "https://invoicedesk.app";
const THUMB_QR_SIZE = 96;
/** Max side of the scaled preview inside the square card. */
const THUMB_FIT = 118;

type QrFrameCarouselProps = {
  design: QrDesign;
  value: QrFrameId;
  onChange: (frameId: QrFrameId) => void;
  logoUrl?: string | null;
};

function FrameThumb({
  frame,
  design,
  selected,
  logoUrl,
}: {
  frame: QrFrameDefinition;
  design: QrDesign;
  selected: boolean;
  logoUrl?: string | null;
}) {
  const quietZone = Math.round(THUMB_QR_SIZE * 0.05);
  const canvasSize = THUMB_QR_SIZE + quietZone * 2;
  const layout = getFrameLayout(canvasSize, frame.id);
  const scale = THUMB_FIT / Math.max(layout.width, layout.height);

  const thumbDesign: QrDesign = {
    ...design,
    frameId: frame.id,
  };

  return (
    <div
      className={cn(
        "flex aspect-square items-center justify-center overflow-hidden rounded-t-[11px] bg-muted/40",
        selected && "bg-primary/5",
      )}
    >
      <div
        className="pointer-events-none"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <QrCodePreview
          value={FRAME_THUMB_VALUE}
          design={thumbDesign}
          logoUrl={logoUrl}
          size={THUMB_QR_SIZE}
          chrome={false}
          className="rounded-none p-0 shadow-none ring-0"
        />
      </div>
    </div>
  );
}

export function QrFrameCarousel({
  design,
  value,
  onChange,
  logoUrl,
}: QrFrameCarouselProps) {
  const isMobile = useIsMobile();

  return (
    <Carousel opts={{ loop: false, align: "start", containScroll: "trimSnaps" }}>
      <div className="mb-2 flex items-center justify-end gap-1.5">
        <CarouselPrevious className="static size-7 translate-x-0 translate-y-0" />
        <CarouselNext className="static size-7 translate-x-0 translate-y-0" />
      </div>
      <CarouselContent className="-ml-2">
        {QR_FRAMES.map((frame) => {
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
                <FrameThumb
                  frame={frame}
                  design={design}
                  selected={selected}
                  logoUrl={logoUrl}
                />
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
