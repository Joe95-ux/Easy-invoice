"use client";

import { useEffect, useMemo, useState } from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CLIENT_EXPORT_FIELDS,
  DEFAULT_CLIENT_EXPORT_FIELD_IDS,
  downloadClientsCsv,
  type ClientExportFieldId,
} from "@/features/clients/lib/export-clients-csv";
import type { ClientListItem } from "@/lib/clients";

type ExportClientsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientListItem[];
};

export function ExportClientsDialog({
  open,
  onOpenChange,
  clients,
}: ExportClientsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<ClientExportFieldId>>(
    () => new Set(DEFAULT_CLIENT_EXPORT_FIELD_IDS),
  );

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set(DEFAULT_CLIENT_EXPORT_FIELD_IDS));
  }, [open]);

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === CLIENT_EXPORT_FIELDS.length;

  const selectionLabel = useMemo(() => {
    if (selectedCount === 0) return "Select at least one field";
    if (allSelected) return "All fields selected";
    return `${selectedCount} field${selectedCount === 1 ? "" : "s"} selected`;
  }, [allSelected, selectedCount]);

  function toggleField(id: ClientExportFieldId, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(
      checked
        ? new Set(CLIENT_EXPORT_FIELDS.map((field) => field.id))
        : new Set(),
    );
  }

  function handleExport() {
    if (selectedIds.size === 0) {
      toast.error("Select at least one field to export");
      return;
    }
    if (clients.length === 0) {
      toast.error("No clients to export");
      return;
    }

    const orderedIds = CLIENT_EXPORT_FIELDS.map((field) => field.id).filter((id) =>
      selectedIds.has(id),
    );
    downloadClientsCsv(clients, orderedIds);
    toast.success(
      `Exported ${clients.length} client${clients.length === 1 ? "" : "s"}`,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export clients</DialogTitle>
          <DialogDescription>
            Choose which columns to include in the CSV. Name and email are
            selected by default for CRM imports.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Exporting {clients.length} client
            {clients.length === 1 ? "" : "s"} matching your current search and
            filters. {selectionLabel}.
          </p>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5 hover:bg-muted/30">
            <Checkbox
              checked={allSelected}
              indeterminate={selectedCount > 0 && !allSelected}
              onCheckedChange={(checked) => toggleAll(checked === true)}
            />
            <span className="text-sm font-medium">Select all fields</span>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            {CLIENT_EXPORT_FIELDS.map((field) => (
              <label
                key={field.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5 hover:bg-muted/30"
              >
                <Checkbox
                  checked={selectedIds.has(field.id)}
                  onCheckedChange={(checked) =>
                    toggleField(field.id, checked === true)
                  }
                />
                <span className="text-sm">{field.label}</span>
              </label>
            ))}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selectedCount === 0 || clients.length === 0}
            onClick={handleExport}
          >
            <DownloadIcon className="size-4" />
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
