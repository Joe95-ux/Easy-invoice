"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  CalendarIcon,
  EyeIcon,
  FileTextIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  UserRoundIcon,
  WifiIcon,
} from "lucide-react";
import type { QrFormState } from "@/features/qr-codes/components/qr-form";
import { cn } from "@/lib/utils";

type QrPhonePreviewProps = {
  form: QrFormState;
  qrElement: ReactNode;
};

type Tab = "preview" | "qr";
type StatusTone = "light" | "dark";

// Fixed brand accent so the mocked hero sections read consistently.
const ACCENT = "oklch(0.47 0.142 266)";
const ACCENT_GRADIENT = `linear-gradient(135deg, ${ACCENT}, oklch(0.58 0.15 300))`;
const CHIP_BG = "oklch(0.47 0.142 266 / 0.14)";

type Palette = {
  bg: string;
  card: string;
  ring: string;
  title: string;
  body: string;
  muted: string;
  faint: string;
  rowBg: string;
  rowBorder: string;
  chip: string;
};

function palette(dark: boolean): Palette {
  return dark
    ? {
        bg: "bg-[#0b0e14]",
        card: "bg-[#151a22]",
        ring: "ring-white/10",
        title: "text-neutral-100",
        body: "text-neutral-200",
        muted: "text-neutral-400",
        faint: "text-neutral-500",
        rowBg: "bg-white/5",
        rowBorder: "border-white/10",
        chip: "#c7d2fe",
      }
    : {
        bg: "bg-neutral-50",
        card: "bg-white",
        ring: "ring-black/5",
        title: "text-neutral-900",
        body: "text-neutral-800",
        muted: "text-neutral-500",
        faint: "text-neutral-400",
        rowBg: "bg-neutral-50",
        rowBorder: "border-black/5",
        chip: ACCENT,
      };
}

function wallpaperStyle(isDark: boolean): CSSProperties {
  const base = isDark ? "#0d1117" : "#e9edf4";
  const line = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
  return {
    backgroundColor: base,
    backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
    backgroundSize: "20px 20px",
  };
}

export function QrPhonePreview({ form, qrElement }: QrPhonePreviewProps) {
  const [tab, setTab] = useState<Tab>("preview");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  const statusTone: StatusTone =
    tab === "qr" || form.type === "LINK" ? (isDark ? "light" : "dark") : "light";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="inline-flex rounded-full border border-border bg-muted p-[0.1rem]">
        {(
          [
            { id: "preview", label: "Preview" },
            { id: "qr", label: "QR code" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === item.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <PhoneFrame statusTone={statusTone}>
        <div className={cn("min-h-full", tab !== "preview" && "hidden")}>
          <QrContentMobile form={form} dark={isDark} />
        </div>
        <div
          className={cn(
            "flex min-h-full flex-col items-center justify-center gap-4 p-6",
            tab !== "qr" && "hidden",
          )}
          style={wallpaperStyle(isDark)}
        >
          {qrElement}
        </div>
      </PhoneFrame>
    </div>
  );
}

function PhoneFrame({
  children,
  statusTone,
}: {
  children: ReactNode;
  statusTone: StatusTone;
}) {
  return (
    <div className="relative w-[250px] shrink-0">
      {/* Side buttons */}
      <span className="absolute -left-[3px] top-24 h-8 w-[3px] rounded-l bg-neutral-700" />
      <span className="absolute -left-[3px] top-36 h-12 w-[3px] rounded-l bg-neutral-700" />
      <span className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r bg-neutral-700" />
      <div className="rounded-[2.75rem] border-[5px] border-neutral-800 bg-neutral-800 shadow-xl">
        <div className="relative h-[520px] overflow-hidden rounded-[2.35rem] bg-neutral-900">
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-[9px] z-30 flex h-[26px] w-[92px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-2.5 shadow-sm">
            <span className="size-[7px] rounded-full bg-neutral-700 ring-1 ring-neutral-600/50" />
          </div>
          <StatusBar tone={statusTone} />
          <div className="no-scrollbar relative h-full overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBar({ tone }: { tone: StatusTone }) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-20 flex h-11 items-center",
        tone === "light" ? "text-white" : "text-neutral-900",
      )}
    >
      <div className="flex flex-1 justify-center">
        <span className="text-[11px] font-semibold tracking-tight tabular-nums">9:41</span>
      </div>
      <div className="w-[92px] shrink-0" />
      <div className="flex flex-1 items-center justify-center gap-[3px]">
        <CellularBars />
        <WifiIcon className="size-[12px]" strokeWidth={2.6} />
        <BatteryGlyph />
      </div>
    </div>
  );
}

function CellularBars() {
  return (
    <span className="flex items-end gap-[1.5px]">
      {[3, 4.5, 6, 7.5].map((height) => (
        <span key={height} className="w-[2px] rounded-[0.5px] bg-current" style={{ height }} />
      ))}
    </span>
  );
}

function BatteryGlyph() {
  return (
    <span className="flex items-center gap-[1px]">
      <span className="relative flex h-[9px] w-[18px] items-center rounded-[2.5px] border border-current/60 px-[1px]">
        <span className="block h-[5px] w-[65%] rounded-[1px] bg-current" />
      </span>
      <span className="h-[3px] w-[1.5px] rounded-r-[1px] bg-current/60" />
    </span>
  );
}

function formatEventDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function QrContentMobile({ form, dark }: { form: QrFormState; dark: boolean }) {
  if (form.type === "VCARD") return <VcardPage form={form} dark={dark} />;
  if (form.type === "EVENT") return <EventPage form={form} dark={dark} />;
  if (form.type === "PDF") return <PdfPage form={form} dark={dark} />;
  return <LinkPage form={form} dark={dark} />;
}

function VcardPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const p = palette(dark);
  const hasContact = Boolean(form.phone || form.email || form.website || form.address);
  return (
    <div className={cn("min-h-full", p.bg)}>
      <div className="px-5 pb-8 pt-12 text-center" style={{ background: ACCENT_GRADIENT }}>
        <div className="mx-auto flex size-[76px] items-center justify-center rounded-full border-4 border-white/25 bg-white/15 text-white backdrop-blur-sm">
          <UserRoundIcon className="size-9" strokeWidth={1.75} />
        </div>
        <p className="mt-3 font-heading text-[18px] font-semibold leading-tight text-white">
          {form.fullName || "Your name"}
        </p>
        {(form.jobTitle || form.organization) && (
          <p className="mt-0.5 text-[12px] text-white/80">
            {[form.jobTitle, form.organization].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <div className="p-4">
        <p className={cn("mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide", p.faint)}>
          Contact
        </p>
        <div className="space-y-1.5">
          {form.phone && <ContactRow dark={dark} icon={<PhoneIcon className="size-4" />} label="Phone" value={form.phone} />}
          {form.email && <ContactRow dark={dark} icon={<MailIcon className="size-4" />} label="Email" value={form.email} />}
          {form.website && <ContactRow dark={dark} icon={<GlobeIcon className="size-4" />} label="Website" value={form.website} />}
          {form.address && <ContactRow dark={dark} icon={<MapPinIcon className="size-4" />} label="Address" value={form.address} />}
          {!hasContact && (
            <>
              <ContactRow dark={dark} icon={<PhoneIcon className="size-4" />} label="Phone" value="+1 (555) 000-0000" muted />
              <ContactRow dark={dark} icon={<MailIcon className="size-4" />} label="Email" value="you@company.com" muted />
            </>
          )}
        </div>
        <AccentButton icon={<UserRoundIcon className="size-4" />}>Save contact</AccentButton>
      </div>
    </div>
  );
}

function EventPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const p = palette(dark);
  const start = form.startAt ? new Date(form.startAt) : null;
  const validStart = start && !Number.isNaN(start.getTime()) ? start : null;
  const month = validStart
    ? validStart.toLocaleDateString(undefined, { month: "short" }).toUpperCase()
    : "MON";
  const day = validStart ? validStart.getDate() : "00";

  return (
    <div className={cn("min-h-full", p.bg)}>
      <div
        className="relative flex h-32 flex-col justify-end p-4 pt-12"
        style={{ background: ACCENT_GRADIENT }}
      >
        <div className="absolute right-4 top-11 flex w-12 flex-col overflow-hidden rounded-xl bg-white text-center shadow-md">
          <span
            className="py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: ACCENT }}
          >
            {month}
          </span>
          <span className="py-1 font-heading text-xl font-bold leading-none text-neutral-900">
            {day}
          </span>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
          You&apos;re invited
        </p>
        <p className="mt-0.5 font-heading text-[17px] font-semibold leading-tight text-white">
          {form.title || "Event title"}
        </p>
      </div>
      <div className="space-y-1.5 p-4">
        <ContactRow
          dark={dark}
          icon={<CalendarIcon className="size-4" />}
          label="When"
          value={validStart ? formatEventDate(form.startAt) : "Date & time"}
          muted={!validStart}
        />
        <ContactRow
          dark={dark}
          icon={<MapPinIcon className="size-4" />}
          label="Where"
          value={form.location || "Location"}
          muted={!form.location}
        />
        {form.eventUrl && (
          <ContactRow dark={dark} icon={<GlobeIcon className="size-4" />} label="Link" value={form.eventUrl} />
        )}
        {form.description && (
          <p className={cn("whitespace-pre-wrap px-1 pt-1 text-[12px] leading-relaxed", p.muted)}>
            {form.description}
          </p>
        )}
        <AccentButton icon={<CalendarIcon className="size-4" />}>Add to calendar</AccentButton>
      </div>
    </div>
  );
}

function PdfPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const p = palette(dark);
  return (
    <div className={cn("min-h-full", p.bg)}>
      <div className="px-5 pb-10 pt-12 text-center" style={{ background: ACCENT_GRADIENT }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
          PDF document
        </p>
        <p className="mt-2 font-heading text-[22px] font-bold leading-tight text-white">
          {form.name || "Your document"}
        </p>
        <p className="mx-auto mt-2 max-w-[85%] text-[12px] leading-relaxed text-white/85">
          Tap below to view the full document.
        </p>
      </div>
      <div className="px-4">
        <div className={cn("-mt-6 rounded-2xl p-3 shadow-lg ring-1", p.card, p.ring)}>
          {/* White "paper" thumbnail — a PDF page reads white in any theme */}
          <div className="rounded-md bg-white p-3 ring-1 ring-black/5">
            <div className="h-2 w-3/5 rounded-full bg-neutral-300" />
            <div className="mt-2.5 space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-neutral-200" />
              <div className="h-1.5 w-full rounded-full bg-neutral-200" />
              <div className="h-1.5 w-4/5 rounded-full bg-neutral-200" />
            </div>
            <div className="mt-3 h-12 rounded" style={{ backgroundColor: "oklch(0.47 0.142 266 / 0.08)" }} />
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-neutral-200" />
              <div className="h-1.5 w-5/6 rounded-full bg-neutral-200" />
            </div>
          </div>
        </div>
      </div>
      <div className={cn("flex items-center gap-2 px-5 pt-3 text-[12px]", p.muted)}>
        <FileTextIcon className="size-4 shrink-0" style={{ color: p.chip }} />
        <span className="truncate">{form.fileName || "document.pdf"}</span>
      </div>
      <div className="px-4 pb-6 pt-3">
        <AccentButton icon={<EyeIcon className="size-4" />}>View PDF</AccentButton>
      </div>
    </div>
  );
}

function LinkPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const p = palette(dark);
  return (
    <div className={cn("min-h-full", dark ? "bg-[#0b0e14]" : "bg-white")}>
      <div
        className={cn(
          "sticky top-0 z-10 flex items-center gap-2 border-b px-3 pb-2 pt-11 backdrop-blur",
          dark ? "border-white/10 bg-[#151a22]/95" : "border-black/5 bg-neutral-100/95",
        )}
      >
        <GlobeIcon className={cn("size-3.5 shrink-0", p.faint)} />
        <span
          className={cn(
            "truncate rounded-full px-2.5 py-1 text-[11px] ring-1",
            dark ? "bg-white/10 text-neutral-300 ring-white/10" : "bg-white text-neutral-500 ring-black/5",
          )}
        >
          {form.url || "https://your-site.com"}
        </span>
      </div>
      <WebsiteSkeleton dark={dark} />
    </div>
  );
}

function WebsiteSkeleton({ dark }: { dark: boolean }) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Bar dark={dark} className="h-4 w-16" />
        <div className="flex gap-1.5">
          <Bar dark={dark} className="size-3 rounded-full" />
          <Bar dark={dark} className="size-3 rounded-full" />
          <Bar dark={dark} className="size-3 rounded-full" />
        </div>
      </div>
      <div className="h-28 w-full rounded-xl" style={{ background: ACCENT_GRADIENT }} />
      <div className="space-y-2">
        <Bar dark={dark} className="h-4 w-3/4" />
        <Bar dark={dark} className="h-3 w-full" />
        <Bar dark={dark} className="h-3 w-full" />
        <Bar dark={dark} className="h-3 w-2/3" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Bar dark={dark} className="h-20 rounded-lg" />
        <Bar dark={dark} className="h-20 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Bar dark={dark} className="h-3 w-full" />
        <Bar dark={dark} className="h-3 w-5/6" />
        <Bar dark={dark} className="h-3 w-full" />
        <Bar dark={dark} className="h-3 w-1/2" />
      </div>
      <Bar dark={dark} className="h-24 w-full rounded-xl" />
      <div className="space-y-2">
        <Bar dark={dark} className="h-3 w-full" />
        <Bar dark={dark} className="h-3 w-4/5" />
        <Bar dark={dark} className="h-3 w-full" />
      </div>
    </div>
  );
}

function Bar({ className, dark }: { className?: string; dark: boolean }) {
  return (
    <div className={cn("animate-pulse rounded", dark ? "bg-white/10" : "bg-neutral-200/90", className)} />
  );
}

function ContactRow({
  icon,
  label,
  value,
  muted,
  dark,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  muted?: boolean;
  dark: boolean;
}) {
  const p = palette(dark);
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border px-3 py-2", p.rowBg, p.rowBorder)}>
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: CHIP_BG, color: p.chip }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className={cn("text-[10px] font-medium uppercase tracking-wide", p.faint)}>{label}</p>
        <p className={cn("truncate text-[12px]", muted ? p.faint : p.body)}>{value}</p>
      </div>
    </div>
  );
}

function AccentButton({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div
      className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold text-white shadow-sm"
      style={{ backgroundColor: ACCENT }}
    >
      {icon}
      {children}
    </div>
  );
}
