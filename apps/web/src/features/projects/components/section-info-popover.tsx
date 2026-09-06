"use client";

import type { ReactNode } from "react";
import { InfoIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type SectionInfoPopoverProps = {
  label: string;
  children: ReactNode;
};

/** Compact info trigger for section headers on tablet/mobile. */
export function SectionInfoPopover({ label, children }: SectionInfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={label}
          />
        }
      >
        <InfoIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={6} className="w-72 gap-0 p-3">
        <p className="text-sm text-muted-foreground">{children}</p>
      </PopoverContent>
    </Popover>
  );
}
