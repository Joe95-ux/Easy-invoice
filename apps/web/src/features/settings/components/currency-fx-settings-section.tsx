"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  companyFxSettingsSchema,
  normalizeCompanyFxSettings,
  type CompanyFxSettings,
  type FxPreferredSource,
} from "@/lib/schemas/fx-settings";
import { cn } from "@/lib/utils";

const SOURCE_OPTIONS: Array<{ value: FxPreferredSource; label: string; hint: string }> = [
  { value: "auto", label: "Auto", hint: "ECB first, then market feed" },
  { value: "ecb", label: "ECB only", hint: "Frankfurter / European Central Bank" },
  { value: "open-er", label: "Market feed", hint: "Broader currency coverage" },
];

export function CurrencyFxSettingsSection() {
  const [settings, setSettings] = useState<CompanyFxSettings | null>(null);
  const [homeCurrency, setHomeCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
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
      const response = await fetch("/api/company/fx-settings");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to load FX settings");
      setHomeCurrency(typeof body.currency === "string" ? body.currency : "USD");
      setSettings(normalizeCompanyFxSettings(body));
      setDirty(false);
      setSaveState("idle");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load FX settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (next: CompanyFxSettings, options?: { silent?: boolean }) => {
      const parsed = companyFxSettingsSchema.safeParse(next);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid FX settings");
        setSaveState("error");
        return false;
      }
      const generation = dirtyGenerationRef.current;
      setSaving(true);
      try {
        const response = await fetch("/api/company/fx-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Failed to save");
        const normalized = normalizeCompanyFxSettings(body);
        if (dirtyGenerationRef.current === generation) {
          setSettings(normalized);
          setDirty(false);
          setSaveState("saved");
        } else {
          setSaveState("idle");
        }
        if (!options?.silent) toast.success("Currency settings saved");
        return true;
      } catch (error) {
        setSaveState("error");
        toast.error(error instanceof Error ? error.message : "Could not save");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!dirty || !settings) return;
    const generation = dirtyGenerationRef.current;
    const timer = window.setTimeout(() => {
      if (dirtyGenerationRef.current !== generation) return;
      const current = settingsRef.current;
      if (!current) return;
      void persist(current, { silent: true });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [dirty, settings, persist]);

  function patch(partial: Partial<CompanyFxSettings>) {
    setSettings((current) => {
      if (!current) return current;
      return { ...current, ...partial };
    });
    bumpDirty();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Currency &amp; exchange</h2>
          <p className="text-sm text-muted-foreground">
            Home currency is <span className="font-medium text-foreground">{homeCurrency}</span>
            {" "}(company settings). Tune how live rates behave on documents.
          </p>
        </div>
        {saveHint ? (
          <span
            className={cn(
              "text-xs",
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
      </div>

      <div className="space-y-0 overflow-hidden rounded-xl border border-border/70">
        <div className="flex flex-col gap-3 border-b border-border/70 bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Rate source</p>
            <p className="text-xs text-muted-foreground">
              {SOURCE_OPTIONS.find((o) => o.value === settings.fxPreferredSource)?.hint}
            </p>
          </div>
          <Select
            value={settings.fxPreferredSource}
            onValueChange={(value) => {
              if (value === "auto" || value === "ecb" || value === "open-er") {
                patch({ fxPreferredSource: value });
              }
            }}
            items={SOURCE_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium">Stale rate warning</p>
            <p className="text-xs text-muted-foreground">
              Flag rates older than this many days on the document form.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={365}
              className="w-20"
              value={settings.fxStaleDays}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) patch({ fxStaleDays: Math.max(0, Math.min(365, n)) });
              }}
            />
            <Label className="text-xs text-muted-foreground">days</Label>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Auto-fetch on currency change</p>
            <p className="text-xs text-muted-foreground">
              Pull a rate when the document currency differs from home.
            </p>
          </div>
          <Switch
            checked={settings.fxAutoFetch}
            onCheckedChange={(checked) => patch({ fxAutoFetch: checked })}
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Lock rate on send</p>
            <p className="text-xs text-muted-foreground">
              Freeze the exchange rate when the invoice or estimate is sent.
            </p>
          </div>
          <Switch
            checked={settings.fxLockOnSend}
            onCheckedChange={(checked) => patch({ fxLockOnSend: checked })}
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Show on PDF</p>
            <p className="text-xs text-muted-foreground">
              Print the exchange rate (and home total) under document totals.
            </p>
          </div>
          <Switch
            checked={settings.fxShowOnPdf}
            onCheckedChange={(checked) => patch({ fxShowOnPdf: checked })}
          />
        </div>
      </div>
    </section>
  );
}
