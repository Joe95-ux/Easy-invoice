"use client";

import { cn } from "@/lib/utils";

type VoiceInputVisualizerProps = {
  levels: number[];
  active: boolean;
  className?: string;
};

export function VoiceInputVisualizer({ levels, active, className }: VoiceInputVisualizerProps) {
  return (
    <div
      className={cn("flex h-5 items-end gap-0.5", className)}
      aria-hidden
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className={cn(
            "w-0.5 rounded-full transition-[height,background-color] duration-75",
            active ? "bg-primary" : "bg-muted-foreground/30",
          )}
          style={{
            height: `${Math.max(4, Math.round(level * 20))}px`,
          }}
        />
      ))}
    </div>
  );
}
