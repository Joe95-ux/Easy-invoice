"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type QrPublicThemeToggleProps = {
  /** Hide Light/Dark labels; icons only (aria-label still set). */
  iconOnly?: boolean;
  className?: string;
};

export function QrPublicThemeToggle({
  iconOnly = false,
  className,
}: QrPublicThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const options = [
    { id: "light", label: "Light", icon: SunIcon, active: mounted && !isDark },
    { id: "dark", label: "Dark", icon: MoonIcon, active: isDark },
  ] as const;

  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-full border border-border bg-muted p-[0.1rem]",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setTheme(option.id)}
          aria-label={`${option.label} theme`}
          title={`${option.label} theme`}
          className={cn(
            "flex cursor-pointer items-center justify-center rounded-full text-xs font-medium transition-colors",
            iconOnly ? "size-6 gap-0 p-0" : "gap-1.5 px-2.5 py-1.5 sm:px-3",
            option.active
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <option.icon className="size-3.5 shrink-0" />
          {iconOnly ? null : (
            <span className="hidden sm:inline">{option.label}</span>
          )}
        </button>
      ))}
    </div>
  );
}
