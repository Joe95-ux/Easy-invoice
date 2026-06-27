"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type FormStep = {
  id: string;
  title: string;
  description: string;
};

type FormStepProgressProps = {
  steps: readonly FormStep[];
  step: number;
  onStepChange: (index: number) => void;
};

export function FormStepProgress({ steps, step, onStepChange }: FormStepProgressProps) {
  const current = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div>
          <p className="font-medium text-foreground">
            Step {step + 1} of {steps.length} · {current.title}
          </p>
          <p className="text-muted-foreground">{current.description}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {Math.round(progress)}%
        </span>
      </div>
      <Progress value={progress} aria-label="Form progress" />
      <div className="flex flex-wrap gap-2">
        {steps.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onStepChange(index)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              index === step
                ? "border-primary bg-primary/10 text-primary"
                : index < step
                  ? "border-border bg-muted/50 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}
