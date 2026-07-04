"use client";

import { useCallback, useEffect, useState } from "react";
import { BellIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { NotificationPreferences } from "@/lib/notifications/types";
import { NOTIFICATION_PREF_LABELS, NOTIFICATION_PREF_DEFAULTS } from "@/lib/notifications/types";

const PREF_KEYS = Object.keys(NOTIFICATION_PREF_LABELS) as (keyof NotificationPreferences)[];

export function NotificationPreferencesSection() {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellIcon className="size-4 text-muted-foreground" />
          Notification preferences
        </CardTitle>
        <CardDescription>
          Choose which events you want to be notified about, and optional celebrations when
          invoices are fully paid.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {PREF_KEYS.map((key) => {
              const { title, description } = NOTIFICATION_PREF_LABELS[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <Label htmlFor={key} className="text-sm font-medium">
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
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
