"use client";

import { useState } from "react";
import { ChevronDownIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AiSourceNotesPanelProps = {
  notes: string;
  onDismiss?: () => void;
  className?: string;
};

export function AiSourceNotesPanel({ notes, onDismiss, className }: AiSourceNotesPanelProps) {
  const [open, setOpen] = useState(true);

  if (!notes.trim()) return null;

  return (
    <div className={cn("rounded-lg border bg-muted/30", className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <FileTextIcon className="size-4 shrink-0 text-primary" />
          <span className="text-sm font-medium">Your original description</span>
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        {onDismiss && (
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
      {open && (
        <div className="border-t px-3 py-3">
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{notes}</p>
        </div>
      )}
    </div>
  );
}
