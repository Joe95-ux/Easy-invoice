"use client";

import { useState } from "react";
import { Loader2Icon, PlusIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import type { AppliedTax, CompanyTaxRate } from "@/lib/schemas/tax-rates";
import { formatTaxPercent, getDefaultTaxRate } from "@/lib/tax-rates";
import { cn } from "@/lib/utils";

type DocumentTaxPanelProps = {
  companyTaxRates: CompanyTaxRate[];
  taxes: AppliedTax[];
  onTaxesChange: (taxes: AppliedTax[]) => void;
  taxInclusive: boolean;
  onTaxInclusiveChange: (value: boolean) => void;
  taxCompound: boolean;
  onTaxCompoundChange: (value: boolean) => void;
  currency: string;
  homeCurrency: string;
  exchangeRate: number | null;
  onExchangeRateChange: (value: number | null) => void;
  className?: string;
};

export function DocumentTaxPanel({
  companyTaxRates,
  taxes,
  onTaxesChange,
  taxInclusive,
  onTaxInclusiveChange,
  taxCompound,
  onTaxCompoundChange,
  currency,
  homeCurrency,
  exchangeRate,
  onExchangeRateChange,
  className,
}: DocumentTaxPanelProps) {
  const [fetchingFx, setFetchingFx] = useState(false);
  const enabledLibrary = companyTaxRates.filter((rate) => rate.enabled);
  const showFx =
    currency.trim().toUpperCase() !== homeCurrency.trim().toUpperCase();
  const showCompound = taxes.length > 1;

  function toggleLibraryRate(rate: CompanyTaxRate) {
    const exists = taxes.some(
      (tax) =>
        tax.id === rate.id || (tax.name === rate.name && tax.rate === rate.rate),
    );
    if (exists) {
      onTaxesChange(
        taxes.filter(
          (tax) =>
            !(
              tax.id === rate.id ||
              (tax.name === rate.name && tax.rate === rate.rate)
            ),
        ),
      );
      return;
    }
    onTaxesChange([...taxes, { id: rate.id, name: rate.name, rate: rate.rate }]);
  }

  function addCustomTax() {
    onTaxesChange([...taxes, { id: null, name: "Tax", rate: 0 }]);
  }

  function updateTax(index: number, patch: Partial<AppliedTax>) {
    onTaxesChange(taxes.map((tax, i) => (i === index ? { ...tax, ...patch } : tax)));
  }

  function removeTax(index: number) {
    onTaxesChange(taxes.filter((_, i) => i !== index));
  }

  function applyDefault() {
    const def = getDefaultTaxRate(companyTaxRates);
    if (!def) return;
    onTaxesChange([{ id: def.id, name: def.name, rate: def.rate }]);
  }

  async function fetchLiveRate() {
    setFetchingFx(true);
    try {
      const params = new URLSearchParams({
        from: currency.trim().toUpperCase(),
        to: homeCurrency.trim().toUpperCase(),
      });
      const response = await fetch(`/api/exchange-rate?${params}`);
      const body = (await response.json()) as {
        rate?: number;
        date?: string;
        error?: string;
      };
      if (!response.ok || body.rate == null) {
        throw new Error(body.error ?? "Could not fetch exchange rate");
      }
      onExchangeRateChange(body.rate);
      toast.success(
        body.date
          ? `Rate updated (${body.date}, ECB)`
          : "Exchange rate updated",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not fetch exchange rate",
      );
    } finally {
      setFetchingFx(false);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Taxes</p>
          <p className="text-xs text-muted-foreground">
            Pick company rates or add a custom rate.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="tax-inclusive" className="text-xs">
              Tax inclusive
            </Label>
            <Switch
              id="tax-inclusive"
              checked={taxInclusive}
              onCheckedChange={onTaxInclusiveChange}
            />
          </div>
          {showCompound ? (
            <div className="flex items-center gap-2">
              <Label htmlFor="tax-compound" className="text-xs">
                Compound
              </Label>
              <Switch
                id="tax-compound"
                checked={taxCompound}
                onCheckedChange={onTaxCompoundChange}
              />
            </div>
          ) : null}
        </div>
      </div>

      {showCompound ? (
        <p className="text-xs text-muted-foreground">
          {taxCompound
            ? "Each tax applies to the base plus prior taxes (stacked)."
            : "Each tax applies to the same taxable base (additive)."}
        </p>
      ) : null}

      {enabledLibrary.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {enabledLibrary.map((rate) => {
            const selected = taxes.some(
              (tax) =>
                tax.id === rate.id ||
                (tax.name === rate.name && tax.rate === rate.rate),
            );
            return (
              <Button
                key={rate.id}
                type="button"
                size="sm"
                variant={selected ? "secondary" : "outline"}
                onClick={() => toggleLibraryRate(rate)}
              >
                {rate.name} ({formatTaxPercent(rate.rate)}%)
              </Button>
            );
          })}
          {taxes.length === 0 ? (
            <Button type="button" size="sm" variant="ghost" onClick={applyDefault}>
              Use default
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        {taxes.map((tax, index) => (
          <div
            key={`${tax.id ?? "custom"}-${index}`}
            className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-[1fr_6.5rem_auto] sm:items-end"
          >
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={tax.name}
                onChange={(e) => updateTax(index, { name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rate (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={Number((tax.rate * 100).toFixed(4))}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  updateTax(index, {
                    rate: Number.isFinite(pct)
                      ? Math.min(1, Math.max(0, pct / 100))
                      : 0,
                  });
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => removeTax(index)}
              aria-label="Remove tax"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addCustomTax}>
          <PlusIcon className="size-4" />
          Custom rate
        </Button>
      </div>

      {showFx ? (
        <Field>
          <FieldLabel htmlFor="exchange-rate">
            Exchange rate ({homeCurrency} per 1 {currency})
          </FieldLabel>
          <FieldContent>
            <div className="flex gap-2">
              <Input
                id="exchange-rate"
                type="number"
                min={0}
                step="0.000001"
                value={exchangeRate ?? ""}
                placeholder="e.g. 0.92"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    onExchangeRateChange(null);
                    return;
                  }
                  const n = Number(value);
                  onExchangeRateChange(Number.isFinite(n) && n > 0 ? n : null);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={fetchingFx}
                onClick={() => void fetchLiveRate()}
              >
                {fetchingFx ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <RefreshCwIcon className="size-4" />
                )}
                Fetch
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Live rates from ECB via Frankfurter. Required when currencies differ.
            </p>
          </FieldContent>
        </Field>
      ) : null}
    </div>
  );
}
