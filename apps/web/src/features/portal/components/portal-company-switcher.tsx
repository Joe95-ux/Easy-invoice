"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2Icon, CheckIcon, ChevronDownIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PortalAccountOption } from "@/lib/portal/types";

type PortalCompanySwitcherProps = {
  accounts: PortalAccountOption[];
};

export function PortalCompanySwitcher({ accounts }: PortalCompanySwitcherProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const current = accounts.find((row) => row.isCurrent) ?? accounts[0];

  if (!current || accounts.length <= 1) {
    return (
      <p className="hidden max-w-[10rem] truncate text-xs text-muted-foreground sm:block">
        {current?.companyName}
      </p>
    );
  }

  async function switchTo(clientId: string) {
    if (!current || clientId === current.clientId) return;
    setLoadingId(clientId);
    try {
      const response = await fetch("/api/portal/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not switch company",
        );
      }
      router.replace("/portal");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not switch company");
      setLoadingId(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="max-w-[9rem] cursor-pointer gap-1.5 text-muted-foreground sm:max-w-[12rem]"
            disabled={Boolean(loadingId)}
          />
        }
      >
        {loadingId ? (
          <Loader2Icon className="size-3.5 shrink-0 animate-spin" />
        ) : (
          <Building2Icon className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{current.companyName}</span>
        <ChevronDownIcon className="size-3.5 shrink-0 opacity-60 max-sm:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Switch company
          </DropdownMenuLabel>
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.clientId}
              className="cursor-pointer gap-2"
              disabled={Boolean(loadingId)}
              onClick={() => void switchTo(account.clientId)}
            >
              <span className="min-w-0 flex-1 truncate">{account.companyName}</span>
              {account.isCurrent ? (
                <CheckIcon className="size-3.5 shrink-0 text-foreground" />
              ) : loadingId === account.clientId ? (
                <Loader2Icon className="size-3.5 shrink-0 animate-spin" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
