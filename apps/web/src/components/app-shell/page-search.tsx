"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import {
  CornerDownLeftIcon,
  SearchIcon,
} from "lucide-react";
import { getAppPageSearchItemsForRole } from "@/components/app-shell/app-sidebar-config";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import type { UserRole } from "@/lib/db";
import { cn } from "@/lib/utils";

type PageSearchProps = {
  userRole: UserRole;
};

const GROUP_ORDER = [
  "Quick actions",
  "Workspace",
  "Team",
  "Settings",
] as const;

function useModKeyLabel() {
  const [modKey, setModKey] = useState("Ctrl");

  useEffect(() => {
    const isApple =
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ||
      /Mac OS X/i.test(navigator.userAgent);
    setModKey(isApple ? "⌘" : "Ctrl");
  }, []);

  return modKey;
}

function SearchResults({
  groups,
  listClassName,
  onSelect,
  onClose,
}: {
  groups: Array<{
    heading: string;
    items: ReturnType<typeof getAppPageSearchItemsForRole>;
  }>;
  listClassName?: string;
  onSelect: (href: string) => void;
  onClose: () => void;
}) {
  return (
    <Command
      className="rounded-none! bg-transparent p-0"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
        <CommandPrimitive.Input
          autoFocus
          placeholder="Search pages and settings…"
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <CommandList className={cn("px-1 py-2", listClassName)}>
        <CommandEmpty>No pages found.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.keywords} ${item.href}`}
                  onSelect={() => onSelect(item.href)}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="truncate">{item.label}</span>
                  <CommandShortcut className="max-w-[45%] truncate font-normal normal-case tracking-normal">
                    {item.href}
                  </CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}

export function PageSearch({ userRole }: PageSearchProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const modKey = useModKeyLabel();

  const items = useMemo(
    () => getAppPageSearchItemsForRole(userRole),
    [userRole],
  );

  const groups = useMemo(() => {
    const byGroup = new Map<string, typeof items>();
    for (const item of items) {
      const list = byGroup.get(item.group) ?? [];
      list.push(item);
      byGroup.set(item.group, list);
    }
    return GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => ({
      heading: group,
      items: byGroup.get(group)!,
    }));
  }, [items]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (open) setOpen(false);
        if (drawerOpen) setDrawerOpen(false);
        return;
      }

      if (event.key.toLowerCase() !== "k") return;
      if (!(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();

      if (isMobile) {
        setOpen(false);
        setDrawerOpen((prev) => !prev);
        return;
      }

      setDrawerOpen(false);
      setOpen((prev) => !prev);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, isMobile, open]);

  function goTo(href: string) {
    setOpen(false);
    setDrawerOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-[55px] md:hidden"
        aria-label="Search pages"
        onClick={() => setDrawerOpen(true)}
      >
        <SearchIcon className="size-5" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "hidden h-8 gap-1.5 rounded-[55px] border-border/70 bg-muted/35 px-2.5 font-normal text-muted-foreground",
                "hover:bg-muted/60 hover:text-foreground md:inline-flex",
              )}
              aria-label="Search pages"
            />
          }
        >
          <SearchIcon className="size-3.5 opacity-70" />
          <KbdGroup className="gap-0.5">
            <Kbd className="h-5 min-w-5 px-1 text-[10px]">{modKey}</Kbd>
            <Kbd className="h-5 min-w-5 px-1 text-[10px]">K</Kbd>
          </KbdGroup>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className={cn(
            "w-[min(calc(100vw-2rem),24rem)] gap-0 overflow-hidden p-0 sm:w-96",
          )}
        >
          <SearchResults
            key={open ? "open" : "closed"}
            groups={groups}
            listClassName="max-h-[min(22rem,50dvh)]"
            onSelect={goTo}
            onClose={() => setOpen(false)}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <KbdGroup className="gap-0.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
              </KbdGroup>
              navigate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>
                <CornerDownLeftIcon className="size-3" />
              </Kbd>
              open
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>esc</Kbd>
              close
            </span>
          </div>
        </PopoverContent>
      </Popover>

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        direction="right"
        shouldScaleBackground={false}
      >
        <DrawerContent
          className={cn(
            "flex h-full max-h-dvh flex-col",
            "data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-none",
            "data-[vaul-drawer-direction=right]:rounded-none",
          )}
        >
          <DrawerHeader className="border-b border-border text-left">
            <DrawerTitle>Search</DrawerTitle>
            <DrawerDescription>
              Jump to pages, settings, and actions
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            <SearchResults
              key={drawerOpen ? "drawer-open" : "drawer-closed"}
              groups={groups}
              listClassName="max-h-[calc(100dvh-8rem)]"
              onSelect={goTo}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
