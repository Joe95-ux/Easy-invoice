"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import {
  EllipsisVerticalIcon,
  GlobeIcon,
  MailIcon,
  PhoneIcon,
  Share2Icon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type BusinessActionsProps = {
  phone: string;
  email: string;
  website: string;
  companyName: string;
  /** Matches hero / CTA palette */
  actionBg: string;
  actionText: string;
  dark?: boolean;
  /**
   * When true, sheet + FAB are positioned inside a relative parent
   * (phone preview). When false, they cover the viewport (public page).
   */
  contained?: boolean;
  className?: string;
};

function ensureHttpUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function BusinessActionsFab({
  phone,
  email,
  website,
  companyName,
  actionBg,
  actionText,
  dark = false,
  contained = false,
  className,
}: BusinessActionsProps) {
  const [open, setOpen] = useState(false);

  const websiteHref = ensureHttpUrl(website);
  const phoneHref = phone.trim() ? `tel:${phone.trim()}` : "";
  const emailHref = email.trim() ? `mailto:${email.trim()}` : "";

  const onShare = useCallback(async () => {
    const url =
      websiteHref || (typeof window !== "undefined" ? window.location.href : "");
    const payload = {
      title: companyName,
      text: companyName,
      url,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(payload);
        return;
      }
      if (url && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // User cancelled share or clipboard unavailable — ignore.
    }
  }, [companyName, websiteHref]);

  const sheetSurface = dark
    ? "border-white/10 bg-[#122033] text-white"
    : "border-black/5 bg-white text-neutral-900";

  const cancelCls = dark
    ? "text-neutral-300 hover:text-white"
    : "text-neutral-500 hover:text-neutral-800";

  return (
    <>
      <button
        type="button"
        aria-label="Open actions"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "flex size-10 cursor-pointer items-center justify-center rounded-full shadow-lg ring-1 ring-black/10 transition-opacity hover:opacity-90",
          contained ? "absolute bottom-5 right-3 z-20" : "fixed bottom-6 right-5 z-40",
          className,
        )}
        style={{ backgroundColor: actionBg, color: actionText }}
      >
        <EllipsisVerticalIcon className="size-5" strokeWidth={2.25} />
      </button>

      {open ? (
        <div
          className={cn(
            "z-40 flex flex-col justify-end",
            contained ? "absolute inset-0" : "fixed inset-0",
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="business-actions-title"
        >
          <button
            type="button"
            aria-label="Dismiss actions"
            className="absolute inset-0 cursor-pointer bg-black/45"
            onClick={() => setOpen(false)}
          />
          {/* pb keeps content clear of the phone home indicator */}
          <div
            className={cn(
              "relative z-10 rounded-t-2xl border-t px-4 pb-8 pt-3 shadow-xl",
              sheetSurface,
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p
                id="business-actions-title"
                className="font-heading text-[15px] font-semibold"
              >
                Actions
              </p>
              <button
                type="button"
                aria-label="Close actions"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors",
                  dark
                    ? "text-neutral-300 hover:bg-white/10"
                    : "text-neutral-500 hover:bg-neutral-100",
                )}
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <ActionPill
                href={phoneHref || undefined}
                disabled={!phoneHref}
                accent={actionBg}
                dark={dark}
                icon={<PhoneIcon className="size-4" />}
                label="Call"
              />
              <ActionPill
                href={emailHref || undefined}
                disabled={!emailHref}
                accent={actionBg}
                dark={dark}
                icon={<MailIcon className="size-4" />}
                label="Email"
              />
              <ActionPill
                href={websiteHref || undefined}
                disabled={!websiteHref}
                accent={actionBg}
                dark={dark}
                icon={<GlobeIcon className="size-4" />}
                label="Website"
                external
              />
              <ActionPill
                accent={actionBg}
                dark={dark}
                icon={<Share2Icon className="size-4" />}
                label="Share"
                onClick={() => {
                  void onShare();
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className={cn(
                "mt-3 w-full cursor-pointer py-2.5 text-center text-[13px] font-semibold tracking-wide",
                cancelCls,
              )}
            >
              CANCEL
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ActionPill({
  label,
  icon,
  accent,
  href,
  onClick,
  disabled,
  external,
  dark,
}: {
  label: string;
  icon: ReactNode;
  accent: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  external?: boolean;
  dark?: boolean;
}) {
  const className = cn(
    "flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[55px] border bg-transparent text-[13px] font-semibold transition-colors",
    dark ? "hover:bg-white/5" : "hover:bg-neutral-50",
    disabled && "pointer-events-none cursor-not-allowed opacity-40",
  );
  const style = { borderColor: accent, color: accent };

  if (href && !disabled) {
    return (
      <a
        href={href}
        className={className}
        style={style}
        {...(external
          ? { target: "_blank", rel: "noreferrer" }
          : undefined)}
      >
        {icon}
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
