"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  CalendarIcon,
  ChevronRightIcon,
  EyeIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  Share2Icon,
  TicketPercentIcon,
  UserRoundIcon,
  UtensilsCrossedIcon,
  WifiIcon,
} from "lucide-react";
import type { QrFormState } from "@/features/qr-codes/components/qr-form";
import {
  EventIllustration,
  MenuIllustration,
  SocialIllustration,
  VcardIllustration,
  DiagonalDivider,
  WaveDivider,
  WifiIllustration,
} from "@/features/qr-codes/components/qr-preview-art";
import { QrSocialIcon } from "@/features/qr-codes/components/qr-social-icon";
import {
  SOCIAL_PLATFORM_LABEL,
  WIFI_ENCRYPTION_LABEL,
} from "@/lib/qr-codes/content";
import { cn } from "@/lib/utils";

type QrPhonePreviewProps = {
  form: QrFormState;
  qrElement: ReactNode;
  /** When false, the QR code tab stays visible but cannot be selected. */
  qrEnabled?: boolean;
};

type Tab = "preview" | "qr";
type StatusTone = "light" | "dark";

const LINK_ACCENT = "oklch(0.47 0.142 266)";
const LINK_GRADIENT = `linear-gradient(135deg, ${LINK_ACCENT}, oklch(0.58 0.15 300))`;

// Distinct color stories per type (qr-code.io style).
const PDF = {
  hero: "linear-gradient(160deg, #F97316 0%, #EA580C 55%, #C2410C 100%)",
  cta: "#EA580C",
  bodyLight: "#FFF7ED",
  bodyDark: "#1c1410",
  cardLight: "#ffffff",
  cardDark: "#2a211c",
};

const VCARD = {
  hero: "linear-gradient(160deg, #0EA5E9 0%, #0284C7 55%, #0369A1 100%)",
  cta: "#0284C7",
  bodyLight: "#F0F9FF",
  bodyDark: "#0b1520",
  cardDark: "#122033",
};

const EVENT = {
  hero: "linear-gradient(160deg, #A855F7 0%, #7C3AED 55%, #6D28D9 100%)",
  cta: "#7C3AED",
  bodyLight: "#FAF5FF",
  bodyDark: "#120b1c",
  cardDark: "#1c1430",
};

const MENU = {
  hero: "linear-gradient(160deg, #F59E0B 0%, #D97706 55%, #B45309 100%)",
  cta: "#D97706",
  bodyLight: "#FFFBEB",
  bodyDark: "#1a1408",
  cardDark: "#241c0e",
};

const WIFI = {
  hero: "linear-gradient(160deg, #10B981 0%, #059669 55%, #047857 100%)",
  cta: "#059669",
  bodyLight: "#ECFDF5",
  bodyDark: "#0a1612",
  cardDark: "#12241c",
};

const SOCIAL = {
  hero: "linear-gradient(160deg, #0EA5E9 0%, #6366F1 55%, #EC4899 100%)",
  cta: "#6366F1",
  bodyLight: "#F0F9FF",
  bodyDark: "#0b1220",
  cardDark: "#151e30",
};

const COUPON = {
  hero: "linear-gradient(160deg, #0EA5E9 0%, #0284C7 55%, #0369A1 100%)",
  cta: "#0284C7",
  bodyLight: "#F0F9FF",
  bodyDark: "#0b1220",
  cardDark: "#151e30",
};

function wallpaperStyle(isDark: boolean): CSSProperties {
  const base = isDark ? "#0d1117" : "#e9edf4";
  const line = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
  return {
    backgroundColor: base,
    backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
    backgroundSize: "20px 20px",
  };
}

export function QrPhonePreview({
  form,
  qrElement,
  qrEnabled = true,
}: QrPhonePreviewProps) {
  const [tab, setTab] = useState<Tab>("preview");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  useEffect(() => {
    if (!qrEnabled && tab === "qr") setTab("preview");
  }, [qrEnabled, tab]);

  // Colored heroes always need a light (white) status bar; link/QR follow theme.
  const statusTone: StatusTone =
    tab === "preview" && form.type !== "LINK"
      ? "light"
      : isDark
        ? "light"
        : "dark";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="inline-flex rounded-full border border-border bg-muted p-[0.1rem]">
        {(
          [
            { id: "preview", label: "Preview", disabled: false },
            { id: "qr", label: "QR code", disabled: !qrEnabled },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            title={
              item.disabled
                ? "Fill in all required content fields to preview the QR code"
                : undefined
            }
            onClick={() => {
              if (!item.disabled) setTab(item.id);
            }}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              item.disabled
                ? "cursor-not-allowed text-muted-foreground/50"
                : "cursor-pointer",
              !item.disabled && tab === item.id
                ? "bg-background text-foreground shadow-sm"
                : !item.disabled && "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <PhoneFrame statusTone={statusTone}>
        <div className={cn("h-full", tab !== "preview" && "hidden")}>
          <QrContentMobile form={form} dark={isDark} />
        </div>
        <div
          className={cn(
            "flex h-full min-h-full flex-col items-center justify-center gap-4 p-6",
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
      <span className="absolute -left-[3px] top-24 h-8 w-[3px] rounded-l bg-neutral-700" />
      <span className="absolute -left-[3px] top-36 h-12 w-[3px] rounded-l bg-neutral-700" />
      <span className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r bg-neutral-700" />
      <div className="rounded-[2.75rem] border-[5px] border-neutral-800 bg-neutral-800 shadow-xl">
        <div className="relative h-[520px] overflow-hidden rounded-[2.35rem]">
          <div className="absolute left-1/2 top-[9px] z-30 flex h-[26px] w-[92px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-2.5 shadow-sm">
            <span className="size-[7px] rounded-full bg-neutral-700 ring-1 ring-neutral-600/50" />
          </div>
          <StatusBar tone={statusTone} />
          <div className="no-scrollbar relative h-full overflow-y-auto">{children}</div>
          {/* Home indicator — pill only, no strip so wallpaper/preview show through */}
          <div
            className="pointer-events-none absolute bottom-2 left-1/2 z-30 h-[4px] w-[108px] -translate-x-1/2 rounded-full bg-black/70 dark:bg-white/75"
            aria-hidden
          />
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
  if (form.type === "MENU") return <MenuPage form={form} dark={dark} />;
  if (form.type === "WIFI") return <WifiPage form={form} dark={dark} />;
  if (form.type === "SOCIAL") return <SocialPage form={form} dark={dark} />;
  if (form.type === "COUPON") return <CouponPage form={form} dark={dark} />;
  return <LinkPage form={form} dark={dark} />;
}

/* ------------------------------------------------------------------ */
/*  PDF — warm orange landing (matches qr-code.io style)               */
/* ------------------------------------------------------------------ */

function PdfPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const eyebrow = form.fileName?.replace(/\.pdf$/i, "") || "Acme Studio";
  const title = form.name.trim() || "Q3 Growth Report";
  const subtitle = form.fileName
    ? "Your document is ready to view."
    : "See how we turned insights into results this quarter.";
  const body = dark ? PDF.bodyDark : PDF.bodyLight;
  const card = dark ? PDF.cardDark : PDF.cardLight;

  return (
    <div className="flex h-full min-h-full flex-col" style={{ backgroundColor: body }}>
      {/* Hero + diagonal cut — card overlaps the slash */}
      <div className="relative shrink-0" style={{ background: PDF.hero }}>
        <div className="px-5 pb-14 pt-12 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
            {eyebrow}
          </p>
          <p className="mt-2 font-heading text-[22px] font-bold leading-tight text-white">
            {title}
          </p>
          <p className="mx-auto mt-2 max-w-[90%] text-[12px] leading-relaxed text-white/90">
            {subtitle}
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0">
          <DiagonalDivider fill={body} />
        </div>
      </div>

      <div className="relative z-10 -mt-8 flex flex-1 flex-col px-4 pb-10">
        <div
          className="overflow-hidden rounded-2xl shadow-[0_12px_28px_-8px_rgba(0,0,0,0.28)]"
          style={{ backgroundColor: card }}
        >
          <div className="px-3 pt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pdf.png"
              alt=""
              className="aspect-10/7 w-full rounded-xl bg-white object-cover"
            />
          </div>
          <div className="p-3.5 pt-3">
            <CtaButton color={PDF.cta} icon={<EyeIcon className="size-4" />}>
              View PDF
            </CtaButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Business card — sky-blue networking page                           */
/* ------------------------------------------------------------------ */

function VcardPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const name = form.fullName.trim() || "Alex Rivera";
  const role =
    [form.jobTitle, form.organization].filter(Boolean).join(" · ") ||
    "Product Designer · Northwind";
  const phone = form.phone.trim() || "+1 (415) 555-0148";
  const email = form.email.trim() || "alex@northwind.co";
  const website = form.website.trim() || "northwind.co";
  const address = form.address.trim() || "San Francisco, CA";

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: dark ? VCARD.bodyDark : VCARD.bodyLight }}
    >
      <div className="px-5 pb-2 pt-12 text-center" style={{ background: VCARD.hero }}>
        <div className="mx-auto flex size-[72px] items-center justify-center rounded-full border-[3px] border-white/40 bg-white/20 text-white shadow-md backdrop-blur-sm">
          <UserRoundIcon className="size-9" strokeWidth={1.6} />
        </div>
        <p className="mt-3 font-heading text-[18px] font-semibold leading-tight text-white">
          {name}
        </p>
        <p className="mt-0.5 text-[12px] text-white/85">{role}</p>
      </div>
      <WaveDivider fill={dark ? VCARD.bodyDark : VCARD.bodyLight} />

      <div className="space-y-3 px-4 pb-6">
        <div
          className={cn(
            "-mt-1 overflow-hidden rounded-2xl shadow-md ring-1",
            dark ? "ring-white/10" : "bg-white ring-black/5",
          )}
          style={{ backgroundColor: dark ? VCARD.cardDark : "#fff" }}
        >
          <VcardIllustration className="w-full" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <ActionChip dark={dark} color="#0284C7" icon={<PhoneIcon className="size-3.5" />} label="Call" />
          <ActionChip dark={dark} color="#0284C7" icon={<MailIcon className="size-3.5" />} label="Email" />
          <ActionChip dark={dark} color="#0284C7" icon={<GlobeIcon className="size-3.5" />} label="Web" />
        </div>

        <div className="space-y-1.5">
          <DetailRow
            dark={dark}
            accent="#0284C7"
            icon={<PhoneIcon className="size-3.5" />}
            label="Phone"
            value={phone}
          />
          <DetailRow
            dark={dark}
            accent="#0284C7"
            icon={<MailIcon className="size-3.5" />}
            label="Email"
            value={email}
          />
          <DetailRow
            dark={dark}
            accent="#0284C7"
            icon={<GlobeIcon className="size-3.5" />}
            label="Website"
            value={website}
          />
          <DetailRow
            dark={dark}
            accent="#0284C7"
            icon={<MapPinIcon className="size-3.5" />}
            label="Address"
            value={address}
          />
        </div>

        <CtaButton color={VCARD.cta} icon={<UserRoundIcon className="size-4" />}>
          Save contact
        </CtaButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Event — violet invite page                                         */
/* ------------------------------------------------------------------ */

function EventPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const start = form.startAt ? new Date(form.startAt) : null;
  const validStart = start && !Number.isNaN(start.getTime()) ? start : null;
  const month = validStart
    ? validStart.toLocaleDateString(undefined, { month: "short" }).toUpperCase()
    : "OCT";
  const day = validStart ? validStart.getDate() : 24;
  const title = form.title.trim() || "Product Launch Party";
  const when = validStart ? formatEventDate(form.startAt) : "Sat, Oct 24 · 7:00 PM";
  const where = form.location.trim() || "The Grand Hall, 5th Ave";
  const description =
    form.description.trim() ||
    "Join us for an evening of demos, drinks, and early access to what's next.";

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: dark ? EVENT.bodyDark : EVENT.bodyLight }}
    >
      <div
        className="relative px-5 pb-2 pt-12"
        style={{ background: EVENT.hero }}
      >
        <div className="absolute right-4 top-11 flex w-12 flex-col overflow-hidden rounded-xl bg-white text-center shadow-md">
          <span className="bg-[#7C3AED] py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            {month}
          </span>
          <span className="py-1 font-heading text-xl font-bold leading-none text-neutral-900">
            {day}
          </span>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
          You&apos;re invited
        </p>
        <p className="mt-1 max-w-[75%] font-heading text-[18px] font-semibold leading-tight text-white">
          {title}
        </p>
      </div>
      <WaveDivider fill={dark ? EVENT.bodyDark : EVENT.bodyLight} />

      <div className="space-y-3 px-4 pb-6">
        <div
          className={cn(
            "-mt-1 overflow-hidden rounded-2xl shadow-md ring-1",
            dark ? "ring-white/10" : "bg-white ring-black/5",
          )}
          style={{ backgroundColor: dark ? EVENT.cardDark : "#fff" }}
        >
          <EventIllustration className="w-full" />
        </div>

        <div className="space-y-1.5">
          <DetailRow
            dark={dark}
            accent="#7C3AED"
            icon={<CalendarIcon className="size-3.5" />}
            label="When"
            value={when}
          />
          <DetailRow
            dark={dark}
            accent="#7C3AED"
            icon={<MapPinIcon className="size-3.5" />}
            label="Where"
            value={where}
          />
          {form.eventUrl.trim() && (
            <DetailRow
              dark={dark}
              accent="#7C3AED"
              icon={<GlobeIcon className="size-3.5" />}
              label="Link"
              value={form.eventUrl.trim()}
            />
          )}
        </div>

        <p
          className={cn(
            "px-1 text-[12px] leading-relaxed",
            dark ? "text-neutral-400" : "text-neutral-600",
          )}
        >
          {description}
        </p>

        <CtaButton color={EVENT.cta} icon={<CalendarIcon className="size-4" />}>
          Add to calendar
        </CtaButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Menu — amber digital menu                                          */
/* ------------------------------------------------------------------ */

function MenuPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const venue = form.venueName.trim() || "The Corner Bistro";
  const subtitle = form.menuSubtitle.trim() || "Seasonal plates & natural wine";
  const currency = form.menuCurrency.trim() || "$";
  const liveItems = form.menuItems.filter((item) => item.name.trim());
  const items =
    liveItems.length > 0
      ? liveItems.slice(0, 4)
      : [
          { name: "Heirloom tomato salad", price: "14", section: "Starters", description: "" },
          { name: "Wood-fired mushrooms", price: "16", section: "Starters", description: "" },
          { name: "Day-boat catch", price: "28", section: "Mains", description: "" },
          { name: "Olive oil cake", price: "12", section: "Dessert", description: "" },
        ];

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: dark ? MENU.bodyDark : MENU.bodyLight }}
    >
      <div className="px-5 pb-2 pt-12 text-center" style={{ background: MENU.hero }}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/20 text-white">
          <UtensilsCrossedIcon className="size-6" />
        </div>
        <p className="mt-2.5 font-heading text-[18px] font-semibold leading-tight text-white">
          {venue}
        </p>
        <p className="mt-0.5 text-[12px] text-white/85">{subtitle}</p>
      </div>
      <WaveDivider fill={dark ? MENU.bodyDark : MENU.bodyLight} />

      <div className="space-y-3 px-4 pb-6">
        <div
          className={cn(
            "-mt-1 overflow-hidden rounded-2xl shadow-md ring-1",
            dark ? "ring-white/10" : "bg-white ring-black/5",
          )}
          style={{ backgroundColor: dark ? MENU.cardDark : "#fff" }}
        >
          <MenuIllustration className="w-full" />
        </div>

        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className={cn(
                "flex items-start justify-between gap-2 rounded-xl border px-3 py-2",
                dark ? "border-white/10 bg-white/5" : "border-black/5 bg-white/70",
              )}
            >
              <div className="min-w-0">
                {item.section && (
                  <p
                    className={cn(
                      "text-[9px] font-semibold uppercase tracking-wide",
                      dark ? "text-amber-400/80" : "text-amber-700/80",
                    )}
                  >
                    {item.section}
                  </p>
                )}
                <p
                  className={cn(
                    "truncate text-[12px] font-medium",
                    dark ? "text-neutral-100" : "text-neutral-800",
                  )}
                >
                  {item.name}
                </p>
              </div>
              {item.price && (
                <p
                  className={cn(
                    "shrink-0 text-[12px] font-semibold tabular-nums",
                    dark ? "text-amber-300" : "text-amber-800",
                  )}
                >
                  {currency}
                  {item.price}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wi‑Fi — emerald connect page                                       */
/* ------------------------------------------------------------------ */

function WifiPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const ssid = form.wifiSsid.trim() || "CornerBistro-Guest";
  const password =
    form.wifiEncryption === "nopass"
      ? ""
      : form.wifiPassword.trim() || "welcome-guests";
  const encryptionLabel = WIFI_ENCRYPTION_LABEL[form.wifiEncryption];

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: dark ? WIFI.bodyDark : WIFI.bodyLight }}
    >
      <div className="px-5 pb-2 pt-12 text-center" style={{ background: WIFI.hero }}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/20 text-white">
          <WifiIcon className="size-6" />
        </div>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
          Wi‑Fi access
        </p>
        <p className="mt-1 font-heading text-[18px] font-semibold leading-tight text-white">
          {ssid}
        </p>
        <p className="mt-0.5 text-[11px] text-white/80">{encryptionLabel}</p>
      </div>
      <WaveDivider fill={dark ? WIFI.bodyDark : WIFI.bodyLight} />

      <div className="space-y-3 px-4 pb-6">
        <div
          className={cn(
            "-mt-1 overflow-hidden rounded-2xl shadow-md ring-1",
            dark ? "ring-white/10" : "bg-white ring-black/5",
          )}
          style={{ backgroundColor: dark ? WIFI.cardDark : "#fff" }}
        >
          <WifiIllustration className="w-full" />
        </div>

        <DetailRow
          dark={dark}
          accent="#059669"
          icon={<WifiIcon className="size-3.5" />}
          label="Network"
          value={ssid}
        />
        <DetailRow
          dark={dark}
          accent="#059669"
          icon={<GlobeIcon className="size-3.5" />}
          label="Password"
          value={password || "Open network"}
        />

        <CtaButton color={WIFI.cta} icon={<WifiIcon className="size-4" />}>
          {password ? "Copy password" : "Open network"}
        </CtaButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Socials — multi-link profile page                                  */
/* ------------------------------------------------------------------ */

function SocialPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const title = form.socialTitle.trim() || "Follow us";
  const subtitle = form.socialSubtitle.trim() || "Find us on your favorite apps";
  const liveLinks = form.socialLinks.filter((link) => link.url.trim());
  const links =
    liveLinks.length > 0
      ? liveLinks.slice(0, 8)
      : [
          { platform: "instagram" as const, url: "#", label: "Follow us" },
          { platform: "facebook" as const, url: "#", label: "Like our page" },
          { platform: "x" as const, url: "#", label: "Join the conversation" },
          { platform: "linkedin" as const, url: "#", label: "Connect with us" },
        ];
  const coverImage = form.socialImageUrl.trim();

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: dark ? SOCIAL.bodyDark : SOCIAL.bodyLight }}
    >
      <div className="px-5 pb-2 pt-12 text-center" style={{ background: SOCIAL.hero }}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/20 text-white">
          <Share2Icon className="size-6" />
        </div>
        <p className="mt-2.5 font-heading text-[18px] font-semibold leading-tight text-white">
          {title}
        </p>
        <p className="mt-0.5 text-[12px] text-white/85">{subtitle}</p>
      </div>
      <WaveDivider fill={dark ? SOCIAL.bodyDark : SOCIAL.bodyLight} />

      <div className="space-y-3 px-4 pb-6">
        <div
          className={cn(
            "-mt-1 overflow-hidden rounded-2xl shadow-md ring-1",
            dark ? "ring-white/10" : "bg-white ring-black/5",
          )}
          style={{ backgroundColor: dark ? SOCIAL.cardDark : "#fff" }}
        >
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt=""
              className="aspect-10/7 w-full object-cover"
            />
          ) : (
            <SocialIllustration className="w-full" dark={dark} />
          )}
        </div>
        <div className="space-y-1.5">
          {links.map((link, index) => (
            <div
              key={`${link.platform}-${index}`}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2",
                dark ? "border-white/10 bg-white/5" : "border-black/5 bg-white/70",
              )}
            >
              <QrSocialIcon platform={link.platform} size={28} />
              <div className="min-w-0 flex-1 text-left">
                <p
                  className={cn(
                    "truncate text-[12px] font-medium",
                    dark ? "text-neutral-100" : "text-neutral-800",
                  )}
                >
                  {SOCIAL_PLATFORM_LABEL[link.platform]}
                </p>
                {link.label?.trim() && (
                  <p
                    className={cn(
                      "truncate text-[10px]",
                      dark ? "text-neutral-400" : "text-neutral-500",
                    )}
                  >
                    {link.label.trim()}
                  </p>
                )}
              </div>
              <ChevronRightIcon
                className={cn(
                  "size-4 shrink-0",
                  dark ? "text-neutral-400" : "text-neutral-400",
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Coupon — promo code page                                           */
/* ------------------------------------------------------------------ */

function CouponPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const code = form.couponCode.trim() || "SAVE20";
  const title = form.couponTitle.trim() || "20% off your first order";
  const description =
    form.couponDescription.trim() || "Valid on full-price items. One use per customer.";
  const body = dark ? COUPON.bodyDark : COUPON.bodyLight;

  return (
    <div className="flex h-full min-h-full flex-col" style={{ backgroundColor: body }}>
      <div className="shrink-0 px-5 pb-2 pt-12 text-center" style={{ background: COUPON.hero }}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/20 text-white">
          <TicketPercentIcon className="size-6" />
        </div>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
          Coupon
        </p>
        <p className="mt-1 font-heading text-[18px] font-semibold leading-tight text-white">
          {title}
        </p>
        <p className="mt-1 text-[11px] text-white/85">{description}</p>
      </div>
      <WaveDivider fill={body} />

      <div className="flex flex-1 flex-col space-y-3 px-4 pb-10">
        <div
          className={cn(
            "-mt-1 overflow-hidden rounded-2xl shadow-md ring-1",
            dark ? "ring-white/10" : "bg-white ring-black/5",
          )}
          style={{ backgroundColor: dark ? COUPON.cardDark : "#fff" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/coupon.png"
            alt=""
            className="aspect-10/7 w-full bg-white object-cover"
          />
        </div>
        <div
          className={cn(
            "rounded-xl border border-dashed px-3 py-3 text-center font-mono text-[16px] font-bold tracking-[0.18em]",
            dark
              ? "border-sky-400/40 bg-sky-500/10 text-sky-200"
              : "border-sky-400/50 bg-sky-50 text-sky-800",
          )}
        >
          {code}
        </div>
        <CtaButton color={COUPON.cta} icon={<TicketPercentIcon className="size-4" />}>
          Copy code
        </CtaButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Website / Link — unchanged skeleton approach                       */
/* ------------------------------------------------------------------ */

function LinkPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  return (
    <div className={cn("min-h-full", dark ? "bg-[#0b0e14]" : "bg-white")}>
      <div
        className={cn(
          "sticky top-0 z-10 flex items-center gap-2 border-b px-3 pb-2 pt-11 backdrop-blur",
          dark ? "border-white/10 bg-[#151a22]/95" : "border-black/5 bg-neutral-100/95",
        )}
      >
        <GlobeIcon
          className={cn("size-3.5 shrink-0", dark ? "text-neutral-500" : "text-neutral-400")}
        />
        <span
          className={cn(
            "truncate rounded-full px-2.5 py-1 text-[11px] ring-1",
            dark
              ? "bg-white/10 text-neutral-300 ring-white/10"
              : "bg-white text-neutral-500 ring-black/5",
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
      <div className="h-28 w-full rounded-xl" style={{ background: LINK_GRADIENT }} />
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
    <div
      className={cn(
        "animate-pulse rounded",
        dark ? "bg-white/10" : "bg-neutral-200/90",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Shared atoms                                                       */
/* ------------------------------------------------------------------ */

function CtaButton({
  color,
  icon,
  children,
}: {
  color: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      {icon}
      {children}
    </div>
  );
}

function ActionChip({
  color,
  icon,
  label,
  dark,
}: {
  color: string;
  icon: ReactNode;
  label: string;
  dark: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl py-2.5 shadow-sm ring-1",
        dark ? "bg-white/5 ring-white/10" : "bg-white/80 ring-black/5",
      )}
    >
      <span
        className="flex size-7 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
      </span>
      <span
        className={cn(
          "text-[10px] font-medium",
          dark ? "text-neutral-300" : "text-neutral-600",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  accent,
  dark,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent: string;
  dark: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2",
        dark ? "border-white/10 bg-white/5" : "border-black/5 bg-white/70",
      )}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: accent }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-[10px] font-medium uppercase tracking-wide",
            dark ? "text-neutral-500" : "text-neutral-400",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "truncate text-[12px] font-medium",
            dark ? "text-neutral-100" : "text-neutral-800",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
