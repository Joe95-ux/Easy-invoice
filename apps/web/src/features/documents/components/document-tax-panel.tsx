"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon, LockIcon, PlusIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import type { AppliedTax, CompanyTaxRate } from "@/lib/schemas/tax-rates";
import {
  formatFxSourceLabel,
  isExchangeRateStale,
  type CompanyFxSettings,
  type FxRateSource,
  DEFAULT_COMPANY_FX_SETTINGS,
} from "@/lib/schemas/fx-settings";
import { formatTaxPercent, getDefaultTaxRate } from "@/lib/tax-rates";
import { cn } from "@/lib/utils";

export type ExchangeRateMeta = {
  rate: number | null;
  date: string | null;
  source: FxRateSource | null;
};

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
  exchangeRateDate?: string | null;
  exchangeRateSource?: FxRateSource | null;
  onExchangeMetaChange?: (meta: {
    date: string | null;
    source: FxRateSource | null;
  }) => void;
  exchangeRateLocked?: boolean;
  onExchangeRateLockedChange?: (locked: boolean) => void;
  /** Document issue date (YYYY-MM-DD) for historical rates. */
  rateAsOfDate?: string | null;
  fxSettings?: Partial<CompanyFxSettings> | null;
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
  exchangeRateDate = null,
  exchangeRateSource = null,
  onExchangeMetaChange,
  exchangeRateLocked = false,
  onExchangeRateLockedChange,
  rateAsOfDate = null,
  fxSettings,
  className,
}: DocumentTaxPanelProps) {
  const [fetchingFx, setFetchingFx] = useState(false);
  const settings = { ...DEFAULT_COMPANY_FX_SETTINGS, ...fxSettings };
  const enabledLibrary = companyTaxRates.filter((rate) => rate.enabled);
  const showFx =
    currency.trim().toUpperCase() !== homeCurrency.trim().toUpperCase();
  const showCompound = taxes.length > 1;
  const locked = exchangeRateLocked === true;
  const stale =
    showFx &&
    isExchangeRateStale(exchangeRateDate, settings.fxStaleDays);
  const autoFetchKeyRef = useRef<string | null>(null);

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

  function applyRateResult(body: {
    rate: number;
    date?: string;
    source?: FxRateSource;
  }) {
    onExchangeRateChange(body.rate);
    onExchangeMetaChange?.({
      date: body.date ?? rateAsOfDate ?? null,
      source: body.source ?? null,
    });
  }

  async function fetchLiveRate(options?: { silent?: boolean }) {
    if (locked) return;
    setFetchingFx(true);
    try {
      const params = new URLSearchParams({
        from: currency.trim().toUpperCase(),
        to: homeCurrency.trim().toUpperCase(),
        prefer: settings.fxPreferredSource,
      });
      if (rateAsOfDate) params.set("date", rateAsOfDate);
      const response = await fetch(`/api/exchange-rate?${params}`);
      const body = (await response.json()) as {
        rate?: number;
        date?: string;
        source?: FxRateSource;
        error?: string;
      };
      if (!response.ok || body.rate == null) {
        throw new Error(body.error ?? "Could not fetch exchange rate");
      }
      applyRateResult({
        rate: body.rate,
        date: body.date,
        source: body.source,
      });
      if (!options?.silent) {
        const sourceLabel = formatFxSourceLabel(body.source);
        toast.success(
          body.date
            ? `Rate updated (${body.date}${sourceLabel ? `, ${sourceLabel}` : ""})`
            : "Exchange rate updated",
        );
      }
    } catch (error) {
      if (!options?.silent) {
        toast.error(
          error instanceof Error ? error.message : "Could not fetch exchange rate",
        );
      }
    } finally {
      setFetchingFx(false);
    }
  }

  // Auto-fetch when currency pair or as-of date changes.
  useEffect(() => {
    if (!showFx || !settings.fxAutoFetch || locked) return;
    const key = `${currency}:${homeCurrency}:${rateAsOfDate ?? ""}`;
    if (autoFetchKeyRef.current === key) return;
    const prevKey = autoFetchKeyRef.current;
    autoFetchKeyRef.current = key;
    // First mount with an existing rate: keep it. Later key changes (currency /
    // issue date) should refresh.
    if (prevKey == null && exchangeRate != null && exchangeRate > 0) return;
    void fetchLiveRate({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional currency-pair trigger
  }, [currency, homeCurrency, rateAsOfDate, showFx, settings.fxAutoFetch, locked]);

  useEffect(() => {
    if (showFx) return;
    if (exchangeRate != null || exchangeRateDate || exchangeRateSource) {
      onExchangeRateChange(null);
      onExchangeMetaChange?.({ date: null, source: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFx]);

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
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/10 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">
                Exchange rate ({homeCurrency} per 1 {currency})
              </p>
              <p className="text-xs text-muted-foreground">
                {rateAsOfDate
                  ? `As of issue date ${rateAsOfDate}. `
                  : ""}
                ECB when available, otherwise a market feed.
              </p>
            </div>
            {locked ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-muted-foreground">
                <LockIcon className="size-3.5" />
                Locked
              </span>
            ) : null}
          </div>

          <div className="flex items-stretch gap-2">
            <Input
              id="exchange-rate"
              type="number"
              min={0}
              step="0.000001"
              value={exchangeRate ?? ""}
              placeholder="e.g. 0.92"
              disabled={locked || fetchingFx}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "") {
                  onExchangeRateChange(null);
                  onExchangeMetaChange?.({ date: null, source: null });
                  return;
                }
                const n = Number(value);
                if (Number.isFinite(n) && n > 0) {
                  onExchangeRateChange(n);
                  onExchangeMetaChange?.({
                    date: rateAsOfDate ?? exchangeRateDate ?? new Date().toISOString().slice(0, 10),
                    source: "manual",
                  });
                } else {
                  onExchangeRateChange(null);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-9 shrink-0"
              disabled={fetchingFx || locked}
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

          {(exchangeRateDate || exchangeRateSource || stale) && (
            <p
              className={cn(
                "text-xs",
                stale ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
              )}
            >
              {[
                exchangeRateDate ? `Rate date ${exchangeRateDate}` : null,
                formatFxSourceLabel(exchangeRateSource),
                stale ? `older than ${settings.fxStaleDays} days` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {locked && onExchangeRateLockedChange ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-xs text-muted-foreground"
              onClick={() => onExchangeRateLockedChange(false)}
            >
              Unlock rate
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
