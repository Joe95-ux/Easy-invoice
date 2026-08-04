"use client";

import { ListTodoIcon } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

type FollowUpQuickAddMenuItemProps = {
  onSelect: () => void;
};

export function FollowUpQuickAddMenuItem({ onSelect }: FollowUpQuickAddMenuItemProps) {
  return (
    <DropdownMenuItem
      onClick={() => {
        onSelect();
      }}
    >
      <ListTodoIcon className="size-4" />
      Add follow-up
    </DropdownMenuItem>
  );
}
