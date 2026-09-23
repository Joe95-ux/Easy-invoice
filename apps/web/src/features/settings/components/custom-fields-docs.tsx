"use client";

import Link from "next/link";
import { BookOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { pageHeaderActionClass } from "@/components/app-shell/page-header";

const SECTIONS = [
  {
    title: "What custom fields are for",
    body: "Capture extra details on invoices and estimates that aren’t part of the default form — PO numbers, job sites, departments, service dates, and anything your clients expect to see.",
  },
  {
    title: "Where they appear",
    body: "Toggle Show on invoices / Show on estimates to control which documents include the field. Show on PDF prints the value on shared documents. Enabled (Visible in the list) hides a field from new documents without deleting it. Disabled fields still keep their labels and values on documents that already have them.",
  },
  {
    title: "Field types",
    body: "Short text, long text, number, date, dropdown, checkbox, email, and URL. Dropdowns need at least one option. Defaults prefill new documents so your team doesn’t retype common values.",
  },
  {
    title: "Required fields",
    body: "When Required is on, the field must be filled before an invoice or estimate can be saved. Use this for details you always need for billing or delivery.",
  },
  {
    title: "Merge tags",
    body: "PDF templates can use {{custom_fields}} for the full list, or a per-field tag like {{custom_field_po_number}} (slug from the field name). Check the Usage tab for each field’s exact tag.",
  },
  {
    title: "Order, reuse, and recurring",
    body: "Drag rows (or use ↑↓ on the handle) to set the order used on forms and PDFs. Recurring invoices copy custom field values from the source invoice. Values already saved on past documents stay visible even if you later rename, disable, or remove a field.",
  },
] as const;

export function CustomFieldsDocsContent({
  onNavigate,
  showSettingsLink = false,
}: {
  onNavigate?: () => void;
  showSettingsLink?: boolean;
}) {
  return (
    <div className="space-y-5 text-sm">
      <p className="leading-relaxed text-muted-foreground">
        Custom fields let each company track the extras that matter for their work — without
        changing the core invoice layout.
      </p>

      <div className="space-y-3">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-xl border border-border/70 bg-muted/15 p-3"
          >
            <p className="font-medium text-foreground">{section.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{section.body}</p>
          </div>
        ))}
      </div>

      {showSettingsLink ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Manage fields in{" "}
          <Link
            href="/settings/custom-fields"
            onClick={onNavigate}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Settings → Custom fields
          </Link>
          .
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Tip: use the dashed “Add a custom field” button for a quick create, or Add field for the
          full side drawer.
        </p>
      )}
    </div>
  );
}

type CustomFieldsDocsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CustomFieldsDocsDrawer({ open, onOpenChange }: CustomFieldsDocsDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      shouldScaleBackground={false}
    >
      <DrawerContent className="flex h-full max-h-dvh flex-col data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader className="border-b border-border text-left">
          <DrawerTitle>Custom fields docs</DrawerTitle>
          <DrawerDescription>
            How to capture extra details on invoices and estimates.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <CustomFieldsDocsContent />
        </div>

        <DrawerFooter className="border-t border-border sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export function CustomFieldsDocsTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      className={pageHeaderActionClass}
      onClick={onClick}
    >
      <BookOpenIcon className="size-4" />
      View docs
    </Button>
  );
}
