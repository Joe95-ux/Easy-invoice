"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { QrFormState } from "@/features/qr-codes/components/qr-form";

type QrPasswordFieldProps = {
  form: QrFormState;
  alreadyProtected: boolean;
  onChange: <K extends keyof QrFormState>(key: K, value: QrFormState[K]) => void;
};

export function QrPasswordField({ form, alreadyProtected, onChange }: QrPasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <LockIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="qr-password-toggle" className="text-sm font-medium">
              Password protection
            </label>
            <Switch
              id="qr-password-toggle"
              checked={form.passwordEnabled}
              onCheckedChange={(checked) => onChange("passwordEnabled", checked)}
            />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Visitors must enter a password before the code opens.
          </p>

          {form.passwordEnabled && (
            <div className="relative mt-3">
              <Input
                type={show ? "text" : "password"}
                value={form.password}
                onChange={(event) => onChange("password", event.target.value)}
                placeholder={
                  alreadyProtected ? "Enter a new password to change it" : "Set a password"
                }
                autoComplete="new-password"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
              {alreadyProtected && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  A password is already set. Leave blank to keep it unchanged.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
