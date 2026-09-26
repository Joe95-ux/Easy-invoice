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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { newFormFieldId } from "@/lib/project-form-ids";
import type { CompanyTaxRate } from "@/lib/schemas/tax-rates";

type TaxRateDraft = {
  id: string;
  name: string;
  ratePercent: string;
  region: string;
  isDefault: boolean;
  enabled: boolean;
};

function draftFromRate(rate: CompanyTaxRate | null): TaxRateDraft {
  if (!rate) {
    return {
      id: newFormFieldId(),
      name: "",
      ratePercent: "0",
      region: "",
      isDefault: false,
      enabled: true,
    };
  }
  return {
    id: rate.id,
    name: rate.name,
    ratePercent: String(Number((rate.rate * 100).toFixed(4))),
    region: rate.region ?? "",
    isDefault: rate.isDefault,
    enabled: rate.enabled,
  };
}

function rateFromDraft(draft: TaxRateDraft): { ok: true; rate: CompanyTaxRate } | { ok: false; error: string } {
  const name = draft.name.trim();
  if (!name) return { ok: false, error: "Name is required" };
  const pct = Number(draft.ratePercent);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    return { ok: false, error: "Rate must be between 0 and 100" };
  }
  return {
    ok: true,
    rate: {
      id: draft.id,
      name: name.slice(0, 80),
      rate: Math.round((pct / 100) * 10000) / 10000,
      region: draft.region.trim() ? draft.region.trim().slice(0, 40) : null,
      isDefault: draft.isDefault,
      enabled: draft.enabled,
    },
  };
}

type TaxRateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rate?: CompanyTaxRate | null;
  onSubmit: (rate: CompanyTaxRate) => void;
  disabled?: boolean;
};

export function TaxRateDrawer({
  open,
  onOpenChange,
  rate = null,
  onSubmit,
  disabled = false,
}: TaxRateDrawerProps) {
  const isEdit = Boolean(rate);
  const [draft, setDraft] = useState<TaxRateDraft>(() => draftFromRate(rate));

  useEffect(() => {
    if (open) setDraft(draftFromRate(rate));
  }, [open, rate]);

  function handleSubmit() {
    const result = rateFromDraft(draft);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onSubmit(result.rate);
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
          <DrawerTitle>{isEdit ? "Edit tax rate" : "Add tax rate"}</DrawerTitle>
          <DrawerDescription>
            {isEdit
              ? "Update this rate for invoices, estimates, and recurring schedules."
              : "Named rates your team can apply when creating documents."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="tax-drawer-name">Name</Label>
            <Input
              id="tax-drawer-name"
              value={draft.name}
              placeholder="e.g. VAT, GST, Sales tax"
              disabled={disabled}
              autoFocus={!isEdit}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tax-drawer-rate">Rate (%)</Label>
              <Input
                id="tax-drawer-rate"
                type="number"
                min={0}
                max={100}
                step="0.01"
                inputMode="decimal"
                value={draft.ratePercent}
                disabled={disabled}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, ratePercent: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax-drawer-region">Region</Label>
              <Input
                id="tax-drawer-region"
                value={draft.region}
                placeholder="Optional"
                disabled={disabled}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, region: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>
          </div>

          <div className="divide-y divide-border/70 rounded-lg border border-border/80">
            <label className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">
                  Available when creating documents
                </p>
              </div>
              <Switch
                checked={draft.enabled}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({ ...prev, enabled: checked === true }))
                }
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Default rate</p>
                <p className="text-xs text-muted-foreground">
                  Pre-selected on new invoices and estimates
                </p>
              </div>
              <Switch
                checked={draft.isDefault}
                disabled={disabled || !draft.enabled}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({
                    ...prev,
                    isDefault: checked === true,
                    enabled: checked === true ? true : prev.enabled,
                  }))
                }
              />
            </label>
          </div>
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
            {isEdit ? "Save rate" : "Create rate"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
