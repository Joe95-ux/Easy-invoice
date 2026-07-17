"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon, LockIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { QrFormState } from "@/features/qr-codes/components/qr-form";
import { QR_ACCESS_PASSWORD_MIN_LENGTH } from "@/lib/qr-codes/password";

type QrPasswordFieldProps = {
  form: QrFormState;
  alreadyProtected: boolean;
  onChange: <K extends keyof QrFormState>(key: K, value: QrFormState[K]) => void;
};

export function QrPasswordField({ form, alreadyProtected, onChange }: QrPasswordFieldProps) {
  const [show, setShow] = useState(false);
  const password = form.password;
  const tooShort =
    form.passwordEnabled &&
    password.length > 0 &&
    password.trim().length < QR_ACCESS_PASSWORD_MIN_LENGTH;
  const needsPassword =
    form.passwordEnabled && !alreadyProtected && password.trim().length === 0;

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
            <div className="mt-3 space-y-1.5">
              <div className="relative">
                <Input
                  type={show ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => onChange("password", event.target.value)}
                  placeholder={
                    alreadyProtected
                      ? "Enter a new password to change it"
                      : `At least ${QR_ACCESS_PASSWORD_MIN_LENGTH} characters`
                  }
                  autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={tooShort || needsPassword ? true : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShow((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
              {alreadyProtected ? (
                <p className="text-xs text-muted-foreground">
                  A password is already set. Leave blank to keep it unchanged.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Required — at least {QR_ACCESS_PASSWORD_MIN_LENGTH} characters.
                </p>
              )}
              {tooShort && (
                <p className="text-xs text-destructive">
                  Password must be at least {QR_ACCESS_PASSWORD_MIN_LENGTH} characters.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
