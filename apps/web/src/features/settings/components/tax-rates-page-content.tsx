"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2Icon, PlusIcon, StarIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { newFormFieldId } from "@/lib/project-form-ids";
import {
  updateCompanyTaxRatesSchema,
  type CompanyTaxRate,
} from "@/lib/schemas/tax-rates";
import {
  formatTaxPercent,
  MAX_COMPANY_TAX_RATES,
  normalizeCompanyTaxRates,
} from "@/lib/tax-rates";
import { cn } from "@/lib/utils";

function emptyRate(): CompanyTaxRate {
  return {
    id: newFormFieldId(),
    name: "",
    rate: 0,
    region: null,
    isDefault: false,
    enabled: true,
  };
}

export function TaxRatesPageContent() {
  const [taxRates, setTaxRates] = useState<CompanyTaxRate[]>([]);
  const [taxInclusiveDefault, setTaxInclusiveDefault] = useState(false);
  const [taxCompoundDefault, setTaxCompoundDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const taxRatesRef = useRef(taxRates);
  taxRatesRef.current = taxRates;
  const taxInclusiveRef = useRef(taxInclusiveDefault);
  taxInclusiveRef.current = taxInclusiveDefault;
  const taxCompoundRef = useRef(taxCompoundDefault);
  taxCompoundRef.current = taxCompoundDefault;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const dirtyGenerationRef = useRef(0);

  const bumpDirty = useCallback(() => {
    dirtyGenerationRef.current += 1;
    setDirty(true);
    setSaveState("idle");
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/company/tax-rates");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to load tax rates");
      setTaxRates(normalizeCompanyTaxRates(body.taxRates));
      setTaxInclusiveDefault(body.taxInclusiveDefault === true);
      setTaxCompoundDefault(body.taxCompoundDefault === true);
      setDirty(false);
      setSaveState("idle");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load tax rates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const persist = useCallback(
    async (
      nextRates: CompanyTaxRate[],
      nextInclusive: boolean,
      nextCompound: boolean,
      options?: { silent?: boolean },
    ) => {
      const parsed = updateCompanyTaxRatesSchema.safeParse({
        taxRates: nextRates,
        taxInclusiveDefault: nextInclusive,
        taxCompoundDefault: nextCompound,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid tax rates");
        setSaveState("error");
        return false;
      }

      const generation = dirtyGenerationRef.current;
      setSaving(true);
      try {
        const response = await fetch("/api/company/tax-rates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Failed to save");
        const normalized = normalizeCompanyTaxRates(body.taxRates);
        if (dirtyGenerationRef.current === generation) {
          setTaxRates(normalized);
          setTaxInclusiveDefault(body.taxInclusiveDefault === true);
          setTaxCompoundDefault(body.taxCompoundDefault === true);
          setDirty(false);
          setSaveState("saved");
        } else {
          setSaveState("idle");
        }
        if (!options?.silent) toast.success("Tax rates saved");
        return true;
      } catch (error) {
        setSaveState("error");
        toast.error(error instanceof Error ? error.message : "Could not save tax rates");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!dirty || loading) return;
    const timer = window.setTimeout(() => {
      void persist(
        taxRatesRef.current,
        taxInclusiveRef.current,
        taxCompoundRef.current,
        { silent: true },
      );
    }, 900);
    return () => window.clearTimeout(timer);
  }, [dirty, loading, persist, taxRates, taxInclusiveDefault, taxCompoundDefault]);

  function applyRates(next: CompanyTaxRate[]) {
    setTaxRates(next);
    bumpDirty();
  }

  function updateRate(id: string, patch: Partial<CompanyTaxRate>) {
    applyRates(
      taxRates.map((rate) => {
        if (rate.id !== id) {
          if (patch.isDefault === true) return { ...rate, isDefault: false };
          return rate;
        }
        return { ...rate, ...patch };
      }),
    );
  }

  function addRate() {
    if (taxRates.length >= MAX_COMPANY_TAX_RATES) {
      toast.error(`You can add at most ${MAX_COMPANY_TAX_RATES} tax rates`);
      return;
    }
    applyRates([...taxRates, emptyRate()]);
  }

  function removeRate(id: string) {
    applyRates(taxRates.filter((rate) => rate.id !== id));
  }

  const saveHint =
    saving
      ? "Saving…"
      : saveState === "saved" && !dirty
        ? "Saved"
        : dirty
          ? "Unsaved"
          : saveState === "error"
            ? "Save failed"
            : null;

  return (
    <>
      <PageHeader
        title="Tax rates"
        description="Manage named tax rates for invoices, estimates, and recurring schedules."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {saveHint ? (
              <span
                className={cn(
                  "text-center text-xs sm:text-right",
                  saveState === "error"
                    ? "text-destructive"
                    : dirty
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-muted-foreground",
                )}
              >
                {saveHint}
              </span>
            ) : null}
            <Button
              className={pageHeaderActionClass}
              disabled={loading || taxRates.length >= MAX_COMPANY_TAX_RATES}
              onClick={addRate}
            >
              <PlusIcon className="size-4" />
              Add tax rate
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/10 px-4 py-3 sm:flex-row sm:items-stretch sm:gap-0">
            <div className="flex flex-1 items-center justify-between gap-4 sm:pr-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Tax-inclusive prices by default</p>
                <p className="text-xs text-muted-foreground">
                  When on, new documents treat line prices as including tax.
                </p>
              </div>
              <Switch
                checked={taxInclusiveDefault}
                onCheckedChange={(checked) => {
                  setTaxInclusiveDefault(checked);
                  bumpDirty();
                }}
                aria-label="Tax-inclusive prices by default"
              />
            </div>
            <div className="hidden w-px bg-border/70 sm:block" />
            <div className="flex flex-1 items-center justify-between gap-4 border-t border-border/50 pt-3 sm:border-t-0 sm:pl-4 sm:pt-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">Compound tax by default</p>
                <p className="text-xs text-muted-foreground">
                  When on with multiple taxes, each rate stacks on prior tax.
                </p>
              </div>
              <Switch
                checked={taxCompoundDefault}
                onCheckedChange={(checked) => {
                  setTaxCompoundDefault(checked);
                  bumpDirty();
                }}
                aria-label="Compound tax by default"
              />
            </div>
          </div>

          {taxRates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 px-6 py-12 text-center">
              <p className="text-sm font-medium">No tax rates yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add VAT, sales tax, or other rates your documents can pick from.
              </p>
              <Button className="mt-4" variant="outline" onClick={addRate}>
                <PlusIcon className="size-4" />
                Add tax rate
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {taxRates.map((rate) => (
                <li
                  key={rate.id}
                  className={cn(
                    "rounded-xl border border-border/70 bg-card p-4",
                    !rate.enabled && "opacity-70",
                  )}
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-end">
                    <div className="space-y-1.5">
                      <Label htmlFor={`tax-name-${rate.id}`}>Name</Label>
                      <Input
                        id={`tax-name-${rate.id}`}
                        value={rate.name}
                        placeholder="e.g. VAT"
                        onChange={(e) => updateRate(rate.id, { name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`tax-rate-${rate.id}`}>Rate (%)</Label>
                      <Input
                        id={`tax-rate-${rate.id}`}
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={Number((rate.rate * 100).toFixed(4))}
                        onChange={(e) => {
                          const pct = Number(e.target.value);
                          updateRate(rate.id, {
                            rate: Number.isFinite(pct)
                              ? Math.min(1, Math.max(0, pct / 100))
                              : 0,
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`tax-region-${rate.id}`}>Region</Label>
                      <Input
                        id={`tax-region-${rate.id}`}
                        value={rate.region ?? ""}
                        placeholder="Optional"
                        onChange={(e) =>
                          updateRate(rate.id, {
                            region: e.target.value.trim() ? e.target.value : null,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-1 sm:justify-end sm:pb-0.5">
                      <Button
                        type="button"
                        variant={rate.isDefault ? "secondary" : "ghost"}
                        size="icon-sm"
                        title={rate.isDefault ? "Default rate" : "Set as default"}
                        onClick={() =>
                          updateRate(rate.id, { isDefault: true, enabled: true })
                        }
                      >
                        <StarIcon
                          className={cn(
                            "size-4",
                            rate.isDefault && "fill-current text-amber-500",
                          )}
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeRate(rate.id)}
                        aria-label={`Delete ${rate.name || "tax rate"}`}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
                    <p className="text-xs text-muted-foreground">
                      Stored as {formatTaxPercent(rate.rate)}%
                      {rate.isDefault ? " · Default" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`tax-enabled-${rate.id}`} className="text-xs">
                        Enabled
                      </Label>
                      <Switch
                        id={`tax-enabled-${rate.id}`}
                        checked={rate.enabled}
                        onCheckedChange={(checked) =>
                          updateRate(rate.id, { enabled: checked })
                        }
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
