"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  ChevronsUpDownIcon,
  HomeIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MoonIcon,
  RouteIcon,
  SunIcon,
  UserRoundIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type UserMenuVariant = "sidebar" | "navbar";

type UserMenuProps = {
  variant?: UserMenuVariant;
  /** Avatar-only trigger (used on mobile public navbar). */
  compactTrigger?: boolean;
};

function userLabel(user: NonNullable<ReturnType<typeof useUser>["user"]>) {
  const name = user.fullName?.trim();
  if (name) return name;
  return user.primaryEmailAddress?.emailAddress ?? "Account";
}

function UserAvatar({
  imageUrl,
  label,
  className,
  variant,
}: {
  imageUrl?: string | null;
  label: string;
  className?: string;
  variant: UserMenuVariant;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn(
          "size-8 shrink-0 rounded-full object-cover",
          variant === "sidebar" ? "ring-1 ring-sidebar-border" : "ring-1 ring-border",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1",
        variant === "sidebar"
          ? "bg-sidebar-primary/15 text-sidebar-primary ring-sidebar-border"
          : "bg-muted text-foreground ring-border",
        className,
      )}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

function MenuGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

export function UserMenu({ variant = "sidebar", compactTrigger = false }: UserMenuProps) {
  const { isLoaded, user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { resolvedTheme, setTheme } = useTheme();

  const isNavbar = variant === "navbar";

  if (!isLoaded || !user) {
    if (isNavbar) {
      return <div className="size-8 animate-pulse rounded-full bg-muted" />;
    }

    return (
      <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/20 p-2">
        <div className="size-8 animate-pulse rounded-full bg-sidebar-accent" />
        <div className="hidden min-w-0 flex-1 space-y-1.5 group-data-[collapsible=icon]:hidden md:block">
          <div className="h-3 w-24 animate-pulse rounded bg-sidebar-accent" />
        </div>
      </div>
    );
  }

  const label = userLabel(user);
  const isDark = resolvedTheme === "dark";
  const showFullTrigger = !compactTrigger;

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg text-left text-sm transition-colors duration-200 outline-none focus-visible:ring-2",
          isNavbar
            ? cn(
                "hover:bg-muted focus-visible:ring-ring",
                compactTrigger ? "p-0.5" : "p-1.5",
              )
            : cn(
                "w-full p-2 hover:bg-sidebar-accent/50 focus-visible:ring-sidebar-ring",
                "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:hover:bg-sidebar-accent/60",
              ),
        )}
      >
        <UserAvatar imageUrl={user.imageUrl} label={label} variant={variant} />
        {showFullTrigger && (
          <>
            <div
              className={cn(
                "min-w-0 flex-1",
                isNavbar ? "hidden sm:block" : "group-data-[collapsible=icon]:hidden",
              )}
            >
              <p
                className={cn(
                  "truncate font-medium",
                  isNavbar ? "max-w-[8rem] text-foreground" : "text-sidebar-foreground",
                )}
              >
                {label}
              </p>
            </div>
            <ChevronsUpDownIcon
              className={cn(
                "size-4 shrink-0",
                isNavbar
                  ? "hidden text-muted-foreground sm:block"
                  : "text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden",
              )}
            />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={isNavbar ? "bottom" : "top"}
        align={isNavbar ? "end" : "center"}
        sideOffset={8}
        className={cn(
          "flex min-w-56 flex-col gap-1 p-1.5",
          isNavbar
            ? "w-56 origin-top-right duration-200 ease-out data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-1 data-open:zoom-in-100 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-top-1 data-closed:zoom-out-100"
            : "w-[var(--anchor-width)] origin-bottom duration-200 ease-out data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-1 data-open:zoom-in-100 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-1 data-closed:zoom-out-100",
        )}
      >
        <MenuGroup>
          <DropdownMenuItem onClick={() => openUserProfile()}>
            <UserRoundIcon />
            My profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme}>
            {isDark ? <SunIcon /> : <MoonIcon />}
            Toggle theme
          </DropdownMenuItem>
        </MenuGroup>

        <DropdownMenuSeparator className="my-0" />

        <MenuGroup>
          {isNavbar ? (
            <DropdownMenuItem render={<Link href="/dashboard" />}>
              <LayoutDashboardIcon />
              Dashboard
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem render={<Link href="/" />}>
              <HomeIcon />
              Homepage
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link href="/process" />}>
            <RouteIcon />
            Process
          </DropdownMenuItem>
        </MenuGroup>

        <DropdownMenuSeparator className="my-0" />

        <MenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => signOut({ redirectUrl: "/" })}
          >
            <LogOutIcon />
            Log out
          </DropdownMenuItem>
        </MenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SidebarUserMenu() {
  return <UserMenu variant="sidebar" />;
}
