"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type QrWifiConnectProps = {
  ssid: string;
  password?: string;
};

export function QrWifiConnect({ ssid, password }: QrWifiConnectProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<"ssid" | "password" | null>(null);

  async function copy(value: string, kind: "ssid" | "password") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(kind === "ssid" ? "Network name copied" : "Password copied");
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="space-y-2">
      <CopyRow
        label="Network"
        value={ssid}
        onCopy={() => copy(ssid, "ssid")}
        copied={copied === "ssid"}
      />
      {password ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Password
            </p>
            <p className="truncate font-mono text-sm">
              {showPassword ? password : "•".repeat(Math.min(password.length, 14))}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Copy password"
            onClick={() => copy(password, "password")}
          >
            {copied === "password" ? (
              <CheckIcon className="size-4 text-emerald-600" />
            ) : (
              <CopyIcon className="size-4" />
            )}
          </Button>
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
          Open network — no password required.
        </p>
      )}
    </div>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Copy ${label}`} onClick={onCopy}>
        {copied ? <CheckIcon className="size-4 text-emerald-600" /> : <CopyIcon className="size-4" />}
      </Button>
    </div>
  );
}
