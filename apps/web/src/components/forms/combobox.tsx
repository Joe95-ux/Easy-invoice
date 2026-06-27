"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboboxOption<T extends string = string> = {
  value: T;
  label: string;
  keywords?: string;
  render?: React.ReactNode;
};

type ComboboxProps<T extends string = string> = {
  id?: string;
  value: T;
  options: ComboboxOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  listClassName?: string;
  showSearch?: boolean;
  matchTriggerWidth?: boolean;
  "aria-label"?: string;
};

export function Combobox<T extends string = string>({
  id,
  value,
  options,
  onChange,
  placeholder = "Select...",
  searchPlaceholder,
  disabled,
  className,
  contentClassName,
  listClassName,
  showSearch = true,
  matchTriggerWidth = true,
  "aria-label": ariaLabel,
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-expanded={open}
            className={cn(
              "h-9 w-full justify-between gap-2 px-3 font-normal",
              className,
            )}
          />
        }
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {selected ? (
            selected.label
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionAvoidance={{ side: "none" }}
        className={cn(
          "overflow-hidden p-0",
          matchTriggerWidth
            ? "w-[var(--anchor-width)] min-w-[var(--anchor-width)]"
            : "w-72 min-w-[16rem]",
          contentClassName,
        )}
      >
        <Command className="overflow-hidden">
          {showSearch && (
            <CommandInput placeholder={searchPlaceholder ?? "Search..."} />
          )}
          <CommandList className={cn("max-h-60 overscroll-contain", listClassName)}>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.keywords ?? ""}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                    {option.render ?? option.label}
                  </span>
                  <CheckIcon
                    className={cn(
                      "size-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
