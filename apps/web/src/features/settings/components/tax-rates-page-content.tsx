"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TaxRateDrawer } from "@/features/settings/components/tax-rate-drawer";
import { TaxRatesTable } from "@/features/settings/components/tax-rates-table";
import {
  updateCompanyTaxRatesSchema,
  type CompanyTaxRate,
} from "@/lib/schemas/tax-rates";
import {
  MAX_COMPANY_TAX_RATES,
  normalizeCompanyTaxRates,
} from "@/lib/tax-rates";
import { cn } from "@/lib/utils";

export function TaxRatesPageContent() {
  const [taxRates, setTaxRates] = useState<CompanyTaxRate[]>([]);
  const [taxInclusiveDefault, setTaxInclusiveDefault] = useState(false);
  const [taxCompoundDefault, setTaxCompoundDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyTaxRate | null>(null);

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

  useEffect(() => {
    if (saveState !== "error" || !dirty || loading || saving) return;
    const timer = window.setTimeout(() => {
      void persist(
        taxRatesRef.current,
        taxInclusiveRef.current,
        taxCompoundRef.current,
        { silent: true },
      );
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [saveState, dirty, loading, saving, persist]);

  function applyRates(next: CompanyTaxRate[]) {
    setTaxRates(next);
    bumpDirty();
  }

  function handleDrawerSubmit(rate: CompanyTaxRate) {
    if (editing) {
      applyRates(
        taxRates.map((row) => {
          if (row.id === editing.id) return rate;
          if (rate.isDefault) return { ...row, isDefault: false };
          return row;
        }),
      );
    } else {
      if (taxRates.length >= MAX_COMPANY_TAX_RATES) {
        toast.error(`You can add at most ${MAX_COMPANY_TAX_RATES} tax rates`);
        return;
      }
      const next = rate.isDefault
        ? taxRates.map((row) => ({ ...row, isDefault: false }))
        : taxRates;
      applyRates([...next, rate]);
    }
    setEditing(null);
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

  const atLimit = taxRates.length >= MAX_COMPANY_TAX_RATES;

  return (
    <>
      <PageHeader
        title="Tax rates"
        description="Named rates for invoices, estimates, and recurring schedules — with defaults for how tax is calculated."
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
              disabled={loading || atLimit}
              onClick={() => {
                if (atLimit) {
                  toast.error(`You can add at most ${MAX_COMPANY_TAX_RATES} tax rates`);
                  return;
                }
                setEditing(null);
                setDrawerOpen(true);
              }}
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
          <section className="overflow-hidden rounded-xl border border-border/80 bg-card">
            <div className="border-b border-border/70 px-4 py-3">
              <h2 className="text-sm font-medium text-foreground">Defaults</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Applied when creating new documents. Individual documents can still override.
              </p>
            </div>
            <div className="divide-y divide-border/70">
              <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Tax-inclusive prices</p>
                  <p className="text-xs text-muted-foreground">
                    Line prices already include tax
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
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Compound stacked taxes</p>
                  <p className="text-xs text-muted-foreground">
                    Each rate applies to the base plus prior tax
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
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3 px-0.5">
              <div>
                <h2 className="text-sm font-medium text-foreground">Library</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {taxRates.length === 0
                    ? "Rates available when creating documents"
                    : `${taxRates.length} rate${taxRates.length === 1 ? "" : "s"}`}
                </p>
              </div>
              {taxRates.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={atLimit}
                  className="text-muted-foreground"
                  onClick={() => {
                    setEditing(null);
                    setDrawerOpen(true);
                  }}
                >
                  <PlusIcon className="size-3.5" />
                  Add
                </Button>
              ) : null}
            </div>

            <TaxRatesTable
              taxRates={taxRates}
              onChange={applyRates}
              onEdit={(rate) => {
                setEditing(rate);
                setDrawerOpen(true);
              }}
            />
          </section>
        </div>
      )}

      <TaxRateDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) setEditing(null);
        }}
        rate={editing}
        onSubmit={handleDrawerSubmit}
      />
    </>
  );
}
