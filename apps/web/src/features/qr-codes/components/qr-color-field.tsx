"use client";

import { Sketch } from "@uiw/react-color";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type QrColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function QrColorField({ label, value, onChange, className }: QrColorFieldProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <Popover>
        <PopoverTrigger
          render={<Button type="button" variant="outline" size="sm" className="w-full justify-start gap-2" />}
        >
          <span
            className="size-4 rounded-sm border border-border/60 shadow-sm"
            style={{ backgroundColor: value }}
          />
          <span className="tabular-nums">{value.toUpperCase()}</span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto border-0 p-0 shadow-lg">
          <Sketch
            color={value}
            onChange={(color) => onChange(color.hex)}
            disableAlpha
            style={{
              background: resolvedTheme === "dark" ? "#18181b" : "#ffffff",
              boxShadow: "none",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
