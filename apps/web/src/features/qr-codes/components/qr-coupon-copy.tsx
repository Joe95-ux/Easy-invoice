"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type QrCouponCopyProps = {
  code: string;
};

export function QrCouponCopy({ code }: QrCouponCopyProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Coupon code copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy code");
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-sky-500/40 bg-sky-500/5 px-3 py-3">
      <p className="min-w-0 flex-1 truncate text-center font-mono text-xl font-bold tracking-[0.18em] text-sky-900 dark:text-sky-100">
        {code}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? <CheckIcon className="size-4 text-emerald-600" /> : <CopyIcon className="size-4" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
