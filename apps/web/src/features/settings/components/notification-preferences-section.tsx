"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { InfoIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { NotificationPreferences } from "@/lib/notifications/types";
import { NOTIFICATION_PREF_DEFAULTS, NOTIFICATION_PREF_LABELS } from "@/lib/notifications/types";

const PREF_KEYS = Object.keys(NOTIFICATION_PREF_LABELS) as (keyof NotificationPreferences)[];

export const NOTIFICATION_PREFERENCES_INFO =
  "Choose which events trigger in-app notifications for your account. You can also enable confetti when an invoice is fully paid.";

export function NotificationPreferencesInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="About notification preferences"
          />
        }
      >
        <InfoIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={6} className="w-80 gap-0">
        <p className="text-sm text-muted-foreground">{NOTIFICATION_PREFERENCES_INFO}</p>
      </PopoverContent>
    </Popover>
  );
}

export function NotificationPreferencesPageContent() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(NOTIFICATION_PREF_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof NotificationPreferences | null>(null);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch("/api/member/notification-preferences");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { preferences: NotificationPreferences };
      setPrefs(data.preferences);
    } catch {
      toast.error("Could not load notification preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPrefs();
  }, [fetchPrefs]);

  async function togglePref(key: keyof NotificationPreferences) {
    const newValue = !prefs[key];
    const previous = { ...prefs };
    setPrefs((p) => ({ ...p, [key]: newValue }));
    setSaving(key);

    try {
      const res = await fetch("/api/member/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { preferences: NotificationPreferences };
      setPrefs(data.preferences);
    } catch {
      setPrefs(previous);
      toast.error("Could not update preference");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Notification preferences"
        titleAddon={
          <span className="hidden sm:inline-flex">
            <NotificationPreferencesInfoPopover />
          </span>
        }
        description={<span className="sm:hidden">{NOTIFICATION_PREFERENCES_INFO}</span>}
        actions={
          <Button
            variant="outline"
            className={pageHeaderActionClass}
            render={<Link href="/settings" />}
          >
            Settings
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {PREF_KEYS.map((key) => {
            const { title, description } = NOTIFICATION_PREF_LABELS[key];

            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <Label
                    htmlFor={key}
                    className="cursor-pointer text-sm font-medium"
                  >
                    {title}
                  </Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  id={key}
                  checked={prefs[key]}
                  onCheckedChange={() => void togglePref(key)}
                  disabled={saving !== null}
                  aria-label={title}
                  className="cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/** @deprecated Use NotificationPreferencesPageContent */
export const NotificationPreferencesSection = NotificationPreferencesPageContent;
