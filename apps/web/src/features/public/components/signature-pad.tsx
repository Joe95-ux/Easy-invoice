"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { EraserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignaturePadProps = {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  className?: string;
};

export function SignaturePad({
  value,
  onChange,
  disabled = false,
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const inkRef = useRef(Boolean(value));
  const [hasInk, setHasInk] = useState(Boolean(value));

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    const snapshot = canvas.toDataURL("image/png");
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    if (inkRef.current || value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = value || snapshot;
    }
  }, [value]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  function pointFromEvent(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDraw(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const point = pointFromEvent(event);
    if (!canvas || !ctx || !point) return;
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function moveDraw(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const point = pointFromEvent(event);
    if (!canvas || !ctx || !point) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    inkRef.current = true;
    setHasInk(true);
  }

  function endDraw() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas || !inkRef.current) return;
    onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    inkRef.current = false;
    setHasInk(false);
    onChange(null);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <canvas
          ref={canvasRef}
          className={cn(
            "h-36 w-full touch-none",
            disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair",
          )}
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
          onPointerCancel={endDraw}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Draw your signature above</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          onClick={clear}
          disabled={disabled || !hasInk}
        >
          <EraserIcon className="size-3.5" />
          Clear
        </Button>
      </div>
    </div>
  );
}
