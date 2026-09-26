"use client";

import {
  MoreHorizontalIcon,
  PencilIcon,
  PercentIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import type { CompanyTaxRate } from "@/lib/schemas/tax-rates";
import { formatTaxPercent } from "@/lib/tax-rates";
import { cn } from "@/lib/utils";

type TaxRatesTableProps = {
  taxRates: CompanyTaxRate[];
  onChange: (taxRates: CompanyTaxRate[]) => void;
  onEdit: (rate: CompanyTaxRate) => void;
  disabled?: boolean;
};

export function TaxRatesTable({
  taxRates,
  onChange,
  onEdit,
  disabled = false,
}: TaxRatesTableProps) {
  function updateRate(id: string, patch: Partial<CompanyTaxRate>) {
    onChange(
      taxRates.map((rate) => {
        if (rate.id !== id) {
          if (patch.isDefault === true) return { ...rate, isDefault: false };
          return rate;
        }
        return { ...rate, ...patch };
      }),
    );
  }

  function removeRate(id: string) {
    onChange(taxRates.filter((rate) => rate.id !== id));
  }

  function setDefault(id: string) {
    onChange(
      taxRates.map((rate) => ({
        ...rate,
        isDefault: rate.id === id,
        enabled: rate.id === id ? true : rate.enabled,
      })),
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
      <div className="hidden grid-cols-[minmax(0,1.4fr)_5.5rem_6.5rem_5rem_4.5rem_2.25rem] gap-2 border-b border-border/70 bg-muted/25 px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
        <span>Name</span>
        <span className="text-right">Rate</span>
        <span>Region</span>
        <span className="text-center">Default</span>
        <span className="text-center">Enabled</span>
        <span />
      </div>

      {taxRates.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <div className="mx-auto mb-3 flex size-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
            <PercentIcon className="size-4" />
          </div>
          <p className="text-sm font-medium text-foreground">No tax rates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add VAT, sales tax, or other rates your documents can pick from.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/70">
          {taxRates.map((rate) => (
            <li key={rate.id}>
              <div
                className={cn(
                  "grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-2.5 px-3 py-3 transition-colors sm:grid-cols-[minmax(0,1.4fr)_5.5rem_6.5rem_5rem_4.5rem_2.25rem] sm:gap-2",
                  !rate.enabled && "bg-muted/20",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => onEdit(rate)}
                  disabled={disabled}
                >
                  <p className="truncate text-sm font-medium text-foreground hover:underline">
                    {rate.name.trim() || "Untitled rate"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                    {formatTaxPercent(rate.rate)}%
                    {rate.region?.trim() ? ` · ${rate.region}` : ""}
                    {rate.isDefault ? " · Default" : ""}
                  </p>
                </button>

                <p className="hidden text-right text-sm tabular-nums text-muted-foreground sm:block">
                  {formatTaxPercent(rate.rate)}%
                </p>

                <p className="hidden truncate text-sm text-muted-foreground sm:block">
                  {rate.region?.trim() || "—"}
                </p>

                <div className="hidden items-center justify-center sm:flex">
                  <button
                    type="button"
                    disabled={disabled}
                    title={rate.isDefault ? "Default rate" : "Set as default"}
                    aria-label={
                      rate.isDefault
                        ? `${rate.name || "Rate"} is default`
                        : `Set ${rate.name || "rate"} as default`
                    }
                    onClick={() => setDefault(rate.id)}
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-40",
                      rate.isDefault
                        ? "text-amber-500 hover:bg-amber-500/10"
                        : "text-muted-foreground/50 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <StarIcon
                      className={cn("size-3.5", rate.isDefault && "fill-current")}
                    />
                  </button>
                </div>

                <div className="hidden items-center justify-center sm:flex">
                  <Switch
                    size="sm"
                    checked={rate.enabled}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      updateRate(rate.id, {
                        enabled: checked === true,
                        ...(checked !== true ? { isDefault: false } : {}),
                      })
                    }
                    aria-label={`Enabled: ${rate.name || "tax rate"}`}
                  />
                </div>

                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Tax rate actions"
                      disabled={disabled}
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-40">
                      <DropdownMenuItem onClick={() => onEdit(rate)}>
                        <PencilIcon className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      {!rate.isDefault ? (
                        <DropdownMenuItem onClick={() => setDefault(rate.id)}>
                          <StarIcon className="size-4" />
                          Set as default
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => removeRate(rate.id)}
                      >
                        <Trash2Icon className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="col-span-2 flex items-center gap-4 border-t border-border/50 pt-2.5 sm:hidden">
                  <label className="flex flex-1 items-center justify-between gap-2 text-xs text-muted-foreground">
                    Default
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setDefault(rate.id)}
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-md",
                        rate.isDefault
                          ? "text-amber-500"
                          : "text-muted-foreground/50",
                      )}
                      aria-label={
                        rate.isDefault ? "Default rate" : "Set as default"
                      }
                    >
                      <StarIcon
                        className={cn("size-3.5", rate.isDefault && "fill-current")}
                      />
                    </button>
                  </label>
                  <label className="flex flex-1 items-center justify-between gap-2 text-xs text-muted-foreground">
                    Enabled
                    <Switch
                      size="sm"
                      checked={rate.enabled}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        updateRate(rate.id, {
                          enabled: checked === true,
                          ...(checked !== true ? { isDefault: false } : {}),
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
