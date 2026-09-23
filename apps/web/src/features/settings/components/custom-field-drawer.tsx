"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  CustomFieldFormFields,
  definitionFromDraft,
  draftFromDefinition,
  type CustomFieldFormDraft,
} from "@/features/settings/components/custom-field-form-fields";
import type { CustomFieldDefinition } from "@/lib/schemas/custom-fields";

type CustomFieldDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, drawer edits this field; otherwise creates a new one. */
  field?: CustomFieldDefinition | null;
  onSubmit: (definition: CustomFieldDefinition) => void;
  disabled?: boolean;
};

export function CustomFieldDrawer({
  open,
  onOpenChange,
  field = null,
  onSubmit,
  disabled = false,
}: CustomFieldDrawerProps) {
  const isEdit = Boolean(field);
  const [draft, setDraft] = useState<CustomFieldFormDraft>(() => draftFromDefinition(field));

  useEffect(() => {
    if (open) setDraft(draftFromDefinition(field));
  }, [open, field]);

  function handleSubmit() {
    const result = definitionFromDraft(draft, field?.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onSubmit(result.definition);
    onOpenChange(false);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      shouldScaleBackground={false}
    >
      <DrawerContent className="flex h-full max-h-dvh flex-col data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader className="border-b border-border text-left">
          <DrawerTitle>{isEdit ? "Edit field" : "Add field"}</DrawerTitle>
          <DrawerDescription>
            {isEdit
              ? "Update how this field appears on invoices and estimates."
              : "Create a field your team can fill on invoices and estimates."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <CustomFieldFormFields
            draft={draft}
            onChange={setDraft}
            disabled={disabled}
            idPrefix={isEdit ? `edit-${field?.id ?? "field"}` : "drawer-new"}
          />
        </div>

        <DrawerFooter className="flex-row justify-end gap-2 border-t border-border sm:flex-row">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={disabled} onClick={handleSubmit}>
            {isEdit ? "Save field" : "Create field"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
