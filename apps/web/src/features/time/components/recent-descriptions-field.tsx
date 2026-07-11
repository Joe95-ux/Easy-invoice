"use client";

import { Button } from "@/components/ui/button";

type RecentDescriptionsFieldProps = {
  descriptions: string[];
  onSelect: (description: string) => void;
};

export function RecentDescriptionsField({
  descriptions,
  onSelect,
}: RecentDescriptionsFieldProps) {
  if (descriptions.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Recent</p>
      <div className="flex flex-wrap gap-2">
        {descriptions.map((description) => (
          <Button
            key={description}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto max-w-full whitespace-normal px-2.5 py-1 text-left text-xs"
            onClick={() => onSelect(description)}
          >
            {description}
          </Button>
        ))}
      </div>
    </div>
  );
}
