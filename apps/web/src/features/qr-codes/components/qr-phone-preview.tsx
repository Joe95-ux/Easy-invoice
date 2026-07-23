"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  EyeIcon,
  GlobeIcon,
  InfoIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  Share2Icon,
  TicketPercentIcon,
  UtensilsCrossedIcon,
  WifiIcon,
} from "lucide-react";
import type { QrFormState } from "@/features/qr-codes/components/qr-form";
import { BusinessActionsFab } from "@/features/qr-codes/components/qr-business-actions";
import {
  EventIllustration,
  MenuIllustration,
  SocialIllustration,
  DiagonalDivider,
  WaveDivider,
  WifiIllustration,
} from "@/features/qr-codes/components/qr-preview-art";
import { QrSocialIcon } from "@/features/qr-codes/components/qr-social-icon";
import {
  hasOpeningHoursCustomization,
  isPreviewSampleMode,
  previewText,
  showPreviewSection,
} from "@/features/qr-codes/preview-sample";
import {
  BUSINESS_FACILITY_META,
  WEEKDAY_LABEL,
  formatTimeLabel,
  isOpenNow,
} from "@/lib/qr-codes/business";
import {
  relativeLuminance,
  resolveBusinessLandingColors,
} from "@/lib/qr-codes/design";
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
  bodyLight: "#F8FAFC",
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

  // Colored heroes need a light status bar; Business uses the design palette
  // so status icons follow hero luminance. Link/QR follow the app theme.
  const businessHeroIsLight =
    form.type === "VCARD" &&
    relativeLuminance(
      resolveBusinessLandingColors(form.design.fgColor, form.design.bgColor).heroBg,
    ) > 0.55;
  const statusTone: StatusTone =
    tab === "preview" && form.type === "VCARD"
      ? businessHeroIsLight
        ? "dark"
        : "light"
      : tab === "preview" && form.type !== "LINK"
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
            "flex h-full min-h-full flex-col items-center justify-center gap-4 px-5 pb-8 pt-6",
            tab !== "qr" && "hidden",
          )}
          style={wallpaperStyle(isDark)}
        >
          <QrFitBox
            key={`${form.design.frameId}-${form.design.frameLabel}-${form.design.logoEnabled}`}
            className="max-h-[340px] w-full max-w-[180px]"
          >
            {qrElement}
          </QrFitBox>
        </div>
      </PhoneFrame>
    </div>
  );
}

/** Scales oversized framed QR previews to fit the phone mockup padding. */
function QrFitBox({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ width: 0, height: 0, scale: 1 });

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const maxW = outer.clientWidth;
      const maxH = outer.clientHeight;
      const width = inner.offsetWidth;
      const height = inner.offsetHeight;
      if (width < 1 || height < 1 || maxW < 1 || maxH < 1) return;
      const scale = Math.min(1, maxW / width, maxH / height);
      setMetrics({ width, height, scale });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      ref={outerRef}
      className={cn("flex items-center justify-center overflow-hidden", className)}
    >
      <div
        className="relative shrink-0"
        style={{
          width: metrics.width > 0 ? metrics.width * metrics.scale : undefined,
          height: metrics.height > 0 ? metrics.height * metrics.scale : undefined,
        }}
      >
        <div
          ref={innerRef}
          className="inline-flex"
          style={
            metrics.scale < 1
              ? {
                  transform: `scale(${metrics.scale})`,
                  transformOrigin: "top left",
                }
              : undefined
          }
        >
          {children}
        </div>
      </div>
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
            className="pointer-events-none absolute bottom-2 left-1/2 z-50 h-[4px] w-[108px] -translate-x-1/2 rounded-full bg-black/70 dark:bg-white/75"
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
  const isSample = isPreviewSampleMode(form);
  const eyebrow = previewText(
    isSample,
    form.fileName?.replace(/\.pdf$/i, "") || "",
    "Acme Studio",
  );
  const title = previewText(isSample, form.name, "Q3 Growth Report");
  const subtitle = isSample
    ? form.fileName
      ? "Your document is ready to view."
      : "See how we turned insights into results this quarter."
    : form.fileName.trim()
      ? "Your document is ready to view."
      : "";
  const body = dark ? PDF.bodyDark : PDF.bodyLight;
  const card = dark ? PDF.cardDark : PDF.cardLight;

  return (
    <div className="flex h-full min-h-full flex-col" style={{ backgroundColor: body }}>
      {/* Hero + diagonal cut — card overlaps the slash */}
      <div className="relative shrink-0" style={{ background: PDF.hero }}>
        <div className="px-5 pb-14 pt-12 text-center">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
              {eyebrow}
            </p>
          )}
          {title && (
            <p className="mt-2 font-heading text-[22px] font-bold leading-tight text-white">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="mx-auto mt-2 max-w-[90%] text-[12px] leading-relaxed text-white/90">
              {subtitle}
            </p>
          )}
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
/*  Business — landing page                                            */
/* ------------------------------------------------------------------ */

const BUSINESS_SECTION =
  "rounded-[10px] border px-3 py-3 shadow-none";
const BUSINESS_COVER_FALLBACK = "/business-cover.jpg";
const BUSINESS_PREVIEW_LINKS = [
  { platform: "linkedin" as const, label: "Company page" },
  { platform: "facebook" as const, label: "Follow us" },
  { platform: "instagram" as const, label: "@yourbusiness" },
];
const BUSINESS_PREVIEW_FACILITIES = ["wifi", "parking", "seating", "accessible"] as const;

function BusinessIconChip({
  children,
  dark,
}: {
  children: ReactNode;
  dark: boolean;
}) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-[8px] [&_svg]:size-3.5",
        dark ? "bg-white/10 text-neutral-200" : "bg-neutral-100 text-neutral-600",
      )}
    >
      {children}
    </span>
  );
}

function VcardPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const isSample = isPreviewSampleMode(form);
  const companyName = previewText(
    isSample,
    form.companyName.trim() || form.organization.trim() || form.fullName.trim(),
    "Acme Consulting",
  );
  const headline = previewText(
    isSample,
    form.businessTitle.trim() || form.jobTitle.trim(),
    "Professional services for growing businesses",
  );
  const subtitle = previewText(
    isSample,
    form.businessSubtitle.trim(),
    "Clear advice, reliable support, and results your team can count on.",
  );
  const coverImage = form.vcardImageUrl.trim() || (isSample ? BUSINESS_COVER_FALLBACK : "");
  const ctaLabel = previewText(isSample, form.ctaLabel.trim(), "Book a consultation");
  const ctaUrl = form.ctaUrl.trim();
  const palette = resolveBusinessLandingColors(
    form.design.fgColor,
    form.design.bgColor,
  );
  const openNow = isOpenNow(form.openingHours);
  const weekdayToday =
    (["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const)[
      new Date().getDay()
    ]!;
  const todayHours = form.openingHours[weekdayToday];
  const liveLinks = form.businessLinks.filter((link) => link.url.trim());
  const previewLinks = isSample
    ? BUSINESS_PREVIEW_LINKS.map((link) => ({
        platform: link.platform,
        url: "#",
        label: link.label,
      }))
    : liveLinks.slice(0, 4);
  const selectedFacilities = form.facilities
    .map((id) => BUSINESS_FACILITY_META.find((item) => item.id === id))
    .filter(Boolean);
  const facilities = isSample
    ? BUSINESS_PREVIEW_FACILITIES.map((id) =>
        BUSINESS_FACILITY_META.find((item) => item.id === id),
      ).filter(Boolean)
    : selectedFacilities;
  const address = previewText(
    isSample,
    form.address.trim(),
    "123 Market Street, Suite 200, San Francisco, CA",
  );
  const about = previewText(
    isSample,
    form.aboutCompany.trim(),
    "We help small businesses streamline operations, strengthen client relationships, and grow with confidence.",
  );
  const contactName = previewText(isSample, form.contactName.trim(), "Alex Morgan");
  const phone = previewText(isSample, form.phone.trim(), "+1 (555) 014-2200");
  const email = previewText(isSample, form.email.trim(), "hello@acmeconsulting.com");
  const website = previewText(isSample, form.website.trim(), "www.acmeconsulting.com");
  const showHero = isSample || Boolean(headline);
  const showCard =
    isSample ||
    Boolean(companyName || subtitle || coverImage || ctaLabel);
  const showHours = showPreviewSection(
    isSample,
    hasOpeningHoursCustomization(form.openingHours),
  );
  const showAddress = showPreviewSection(isSample, Boolean(form.address.trim()));
  const showFacilities = showPreviewSection(isSample, form.facilities.length > 0);
  const showLinks = showPreviewSection(isSample, liveLinks.length > 0);
  const showAbout = showPreviewSection(isSample, Boolean(form.aboutCompany.trim()));
  const hasContact =
    Boolean(form.contactName.trim()) ||
    Boolean(form.phone.trim()) ||
    Boolean(form.email.trim()) ||
    Boolean(form.website.trim());
  const showContact = showPreviewSection(isSample, hasContact);
  const body = dark ? VCARD.bodyDark : VCARD.bodyLight;
  const card = dark ? VCARD.cardDark : "#fff";
  const sectionCls = cn(
    BUSINESS_SECTION,
    dark ? "border-white/10 bg-white/5" : "border-black/5 bg-white",
  );

  return (
    <div
      className="relative h-full min-h-full overflow-hidden"
      style={{ backgroundColor: body }}
    >
      <div className="no-scrollbar h-full overflow-y-auto">
        {showHero && (
          <div className="relative shrink-0" style={{ backgroundColor: palette.heroBg }}>
            <div className="px-5 pb-28 pt-14 text-center">
              <p
                className="font-heading text-[18px] font-bold leading-tight"
                style={{ color: palette.heroText }}
              >
                {headline}
              </p>
            </div>
            <div className="absolute inset-x-0 bottom-0">
              <DiagonalDivider fill={body} />
            </div>
          </div>
        )}

        <div
          className={cn(
            "relative z-10 flex flex-col gap-3 px-4 pb-12",
            showHero ? "-mt-[5.25rem]" : "pt-4",
          )}
        >
          {showCard && (
            <div
              className={cn(
                "overflow-hidden rounded-[10px] ring-1",
                dark ? "ring-white/10" : "ring-black/5",
              )}
              style={{ backgroundColor: card }}
            >
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImage}
                  alt=""
                  className="aspect-10/7 w-full object-cover"
                />
              ) : null}
              <div className="space-y-3 p-3.5">
                {companyName && (
                  <div>
                    <p
                      className={cn(
                        "font-heading text-[16px] font-bold leading-tight",
                        dark ? "text-white" : "text-neutral-900",
                      )}
                    >
                      {companyName}
                    </p>
                    {subtitle && (
                      <p
                        className={cn(
                          "mt-1 text-[11px] leading-relaxed",
                          dark ? "text-neutral-300" : "text-neutral-500",
                        )}
                      >
                        {subtitle}
                      </p>
                    )}
                  </div>
                )}
                {ctaLabel &&
                  (ctaUrl ? (
                    <a
                      href={ctaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-10 w-full cursor-pointer items-center justify-center rounded-[10px] text-[13px] font-semibold"
                      style={{
                        backgroundColor: palette.ctaBg,
                        color: palette.ctaText,
                      }}
                    >
                      {ctaLabel}
                    </a>
                  ) : (
                    <div
                      className="flex h-10 w-full cursor-pointer items-center justify-center rounded-[10px] text-[13px] font-semibold"
                      style={{
                        backgroundColor: palette.ctaBg,
                        color: palette.ctaText,
                      }}
                    >
                      {ctaLabel}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {showHours && (
            <div className={sectionCls}>
              <div className="flex items-center gap-2.5">
                <BusinessIconChip dark={dark}>
                  <ClockIcon />
                </BusinessIconChip>
                <p className={cn("text-[12px]", dark ? "text-neutral-200" : "text-neutral-700")}>
                  Open hours —{" "}
                  <span
                    className="font-semibold"
                    style={{ color: openNow ? palette.accent : undefined }}
                  >
                    {openNow
                      ? "Open now"
                      : todayHours.closed
                        ? "Closed today"
                        : isSample
                          ? "Mon–Fri · 9:00 AM – 5:00 PM"
                          : "See hours"}
                  </span>
                </p>
              </div>
              <div className="mt-2 space-y-0.5 pl-[2.375rem]">
                <p
                  className={cn(
                    "text-[11px] font-medium",
                    dark ? "text-neutral-300" : "text-neutral-600",
                  )}
                >
                  {WEEKDAY_LABEL[weekdayToday]}:
                </p>
                {!todayHours.closed && todayHours.slots.length > 0 ? (
                  todayHours.slots.map((slot, index) => (
                    <p
                      key={index}
                      className={cn(
                        "text-[11px]",
                        dark ? "text-neutral-400" : "text-neutral-500",
                      )}
                    >
                      {formatTimeLabel(slot.open)} - {formatTimeLabel(slot.close)}
                    </p>
                  ))
                ) : (
                  <p
                    className={cn(
                      "text-[11px]",
                      dark ? "text-neutral-400" : "text-neutral-500",
                    )}
                  >
                    {todayHours.closed ? "Closed" : "9:00 AM - 5:00 PM"}
                  </p>
                )}
              </div>
            </div>
          )}

          {showAddress && address && (
            <div className={cn(sectionCls, "flex cursor-pointer items-start gap-2.5")}>
              <BusinessIconChip dark={dark}>
                <MapPinIcon />
              </BusinessIconChip>
              <p
                className={cn(
                  "pt-1 text-[11px] leading-relaxed",
                  dark ? "text-neutral-300" : "text-neutral-600",
                )}
              >
                {address}
              </p>
            </div>
          )}

          {showFacilities && facilities.length > 0 && (
            <div className={sectionCls}>
              <p
                className={cn(
                  "mb-2 text-[11px] font-semibold",
                  dark ? "text-neutral-200" : "text-neutral-700",
                )}
              >
                Facilities
              </p>
              <div className="grid grid-cols-5 gap-2">
                {facilities.map((facility) =>
                  facility ? (
                    <div
                      key={facility.id}
                      className="flex cursor-pointer flex-col items-center gap-1"
                      title={facility.label}
                    >
                      <span
                        className={cn(
                          "flex size-9 items-center justify-center rounded-[10px]",
                          dark
                            ? "bg-white/10 text-neutral-100"
                            : "bg-neutral-100 text-neutral-700",
                        )}
                      >
                        <facility.icon className="size-4" strokeWidth={1.75} />
                      </span>
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          )}

          {showLinks && previewLinks.length > 0 && (
            <div className="space-y-1.5">
              {previewLinks.map((link, index) => (
                <div
                  key={`${link.platform}-${index}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2",
                    dark ? "border-white/10 bg-white/5" : "border-black/5 bg-white",
                  )}
                >
                  <QrSocialIcon platform={link.platform} size={26} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-[11px] font-medium",
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
          )}

          {showAbout && about && (
            <div className={sectionCls}>
              <div className="mb-1.5 flex items-center gap-1.5">
                <InfoIcon
                  className={cn(
                    "size-3.5",
                    dark ? "text-neutral-300" : "text-neutral-500",
                  )}
                />
                <p
                  className={cn(
                    "text-[11px] font-semibold",
                    dark ? "text-neutral-200" : "text-neutral-700",
                  )}
                >
                  About Us
                </p>
              </div>
              <p
                className={cn(
                  "text-[11px] leading-relaxed",
                  dark ? "text-neutral-300" : "text-neutral-600",
                )}
              >
                {about}
              </p>
            </div>
          )}

          {showContact && (
            <div className={cn(sectionCls, "space-y-2")}>
              {contactName && (
                <p
                  className={cn(
                    "text-[11px] font-semibold",
                    dark ? "text-neutral-200" : "text-neutral-700",
                  )}
                >
                  {contactName}
                </p>
              )}
              {phone && (
                <PreviewContactLine dark={dark} icon={<PhoneIcon />} value={phone} />
              )}
              {email && (
                <PreviewContactLine dark={dark} icon={<MailIcon />} value={email} />
              )}
              {website && (
                <PreviewContactLine dark={dark} icon={<GlobeIcon />} value={website} />
              )}
            </div>
          )}
        </div>
      </div>

      <BusinessActionsFab
        contained
        dark={dark}
        phone={isSample ? "+1 (555) 014-2200" : form.phone.trim()}
        email={isSample ? "hello@acmeconsulting.com" : form.email.trim()}
        website={isSample ? "www.acmeconsulting.com" : form.website.trim()}
        companyName={companyName || "Business"}
        actionBg={palette.heroBg}
        actionText={palette.heroText}
      />
    </div>
  );
}

function PreviewContactLine({
  icon,
  value,
  dark,
}: {
  icon: ReactNode;
  value: string;
  dark: boolean;
}) {
  return (
    <div className="flex cursor-pointer items-center gap-2.5">
      <BusinessIconChip dark={dark}>{icon}</BusinessIconChip>
      <span
        className={cn(
          "truncate text-[11px]",
          dark ? "text-neutral-300" : "text-neutral-600",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Event — violet invite page                                         */
/* ------------------------------------------------------------------ */

function EventPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const isSample = isPreviewSampleMode(form);
  const start = form.startAt ? new Date(form.startAt) : null;
  const validStart = start && !Number.isNaN(start.getTime()) ? start : null;
  const month = validStart
    ? validStart.toLocaleDateString(undefined, { month: "short" }).toUpperCase()
    : isSample
      ? "OCT"
      : "";
  const day = validStart ? validStart.getDate() : isSample ? 24 : null;
  const title = previewText(isSample, form.title.trim(), "Product Launch Party");
  const when = validStart
    ? formatEventDate(form.startAt)
    : isSample
      ? "Sat, Oct 24 · 7:00 PM"
      : "";
  const where = previewText(isSample, form.location.trim(), "The Grand Hall, 5th Ave");
  const description = previewText(
    isSample,
    form.description.trim(),
    "Join us for an evening of demos, drinks, and early access to what's next.",
  );
  const showDateBadge = isSample || Boolean(validStart);

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: dark ? EVENT.bodyDark : EVENT.bodyLight }}
    >
      <div
        className="relative px-5 pb-2 pt-12"
        style={{ background: EVENT.hero }}
      >
        {showDateBadge && day !== null && month && (
          <div className="absolute right-4 top-11 flex w-12 flex-col overflow-hidden rounded-xl bg-white text-center shadow-md">
            <span className="bg-[#7C3AED] py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              {month}
            </span>
            <span className="py-1 font-heading text-xl font-bold leading-none text-neutral-900">
              {day}
            </span>
          </div>
        )}
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
          You&apos;re invited
        </p>
        {title && (
          <p className="mt-1 max-w-[75%] font-heading text-[18px] font-semibold leading-tight text-white">
            {title}
          </p>
        )}
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
          {when && (
            <DetailRow
              dark={dark}
              accent="#7C3AED"
              icon={<CalendarIcon className="size-3.5" />}
              label="When"
              value={when}
            />
          )}
          {where && (
            <DetailRow
              dark={dark}
              accent="#7C3AED"
              icon={<MapPinIcon className="size-3.5" />}
              label="Where"
              value={where}
            />
          )}
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

        {description && (
          <p
            className={cn(
              "px-1 text-[12px] leading-relaxed",
              dark ? "text-neutral-400" : "text-neutral-600",
            )}
          >
            {description}
          </p>
        )}

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
  const isSample = isPreviewSampleMode(form);
  const venue = previewText(isSample, form.venueName.trim(), "The Corner Bistro");
  const subtitle = previewText(
    isSample,
    form.menuSubtitle.trim(),
    "Seasonal plates & natural wine",
  );
  const currency = form.menuCurrency.trim() || (isSample ? "$" : "");
  const liveItems = form.menuItems.filter((item) => item.name.trim());
  const items = isSample
    ? [
        { name: "Heirloom tomato salad", price: "14", section: "Starters", description: "" },
        { name: "Wood-fired mushrooms", price: "16", section: "Starters", description: "" },
        { name: "Day-boat catch", price: "28", section: "Mains", description: "" },
        { name: "Olive oil cake", price: "12", section: "Dessert", description: "" },
      ]
    : liveItems.slice(0, 8);

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: dark ? MENU.bodyDark : MENU.bodyLight }}
    >
      <div className="px-5 pb-2 pt-12 text-center" style={{ background: MENU.hero }}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/20 text-white">
          <UtensilsCrossedIcon className="size-6" />
        </div>
        {venue && (
          <p className="mt-2.5 font-heading text-[18px] font-semibold leading-tight text-white">
            {venue}
          </p>
        )}
        {subtitle && (
          <p className="mt-0.5 text-[12px] text-white/85">{subtitle}</p>
        )}
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

        {items.length > 0 && (
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
                {item.price && currency && (
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
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wi‑Fi — emerald connect page                                       */
/* ------------------------------------------------------------------ */

function WifiPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const isSample = isPreviewSampleMode(form);
  const ssid = previewText(isSample, form.wifiSsid.trim(), "CornerBistro-Guest");
  const livePassword =
    form.wifiEncryption === "nopass" ? "" : form.wifiPassword.trim();
  const password = isSample ? livePassword || "welcome-guests" : livePassword;
  const encryptionLabel = WIFI_ENCRYPTION_LABEL[form.wifiEncryption];
  const showPasswordRow =
    isSample || form.wifiEncryption === "nopass" || Boolean(livePassword);

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
        {ssid && (
          <p className="mt-1 font-heading text-[18px] font-semibold leading-tight text-white">
            {ssid}
          </p>
        )}
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

        {ssid && (
          <DetailRow
            dark={dark}
            accent="#059669"
            icon={<WifiIcon className="size-3.5" />}
            label="Network"
            value={ssid}
          />
        )}
        {showPasswordRow && (
          <DetailRow
            dark={dark}
            accent="#059669"
            icon={<GlobeIcon className="size-3.5" />}
            label="Password"
            value={
              form.wifiEncryption === "nopass"
                ? "Open network"
                : password || "Open network"
            }
          />
        )}

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
  const isSample = isPreviewSampleMode(form);
  const title = previewText(isSample, form.socialTitle.trim(), "Follow us");
  const subtitle = previewText(
    isSample,
    form.socialSubtitle.trim(),
    "Find us on your favorite apps",
  );
  const liveLinks = form.socialLinks.filter((link) => link.url.trim());
  const links = isSample
    ? [
        { platform: "instagram" as const, url: "#", label: "Follow us" },
        { platform: "facebook" as const, url: "#", label: "Like our page" },
        { platform: "x" as const, url: "#", label: "Join the conversation" },
        { platform: "linkedin" as const, url: "#", label: "Connect with us" },
      ]
    : liveLinks.slice(0, 8);
  const coverImage = form.socialImageUrl.trim();
  const showCover = isSample || Boolean(coverImage);

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: dark ? SOCIAL.bodyDark : SOCIAL.bodyLight }}
    >
      <div className="px-5 pb-2 pt-12 text-center" style={{ background: SOCIAL.hero }}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/20 text-white">
          <Share2Icon className="size-6" />
        </div>
        {title && (
          <p className="mt-2.5 font-heading text-[18px] font-semibold leading-tight text-white">
            {title}
          </p>
        )}
        {subtitle && (
          <p className="mt-0.5 text-[12px] text-white/85">{subtitle}</p>
        )}
      </div>
      <WaveDivider fill={dark ? SOCIAL.bodyDark : SOCIAL.bodyLight} />

      <div className="space-y-3 px-4 pb-6">
        {showCover && (
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
        )}
        {links.length > 0 && (
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
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Coupon — promo code page                                           */
/* ------------------------------------------------------------------ */

function CouponPage({ form, dark }: { form: QrFormState; dark: boolean }) {
  const isSample = isPreviewSampleMode(form);
  const code = previewText(isSample, form.couponCode.trim(), "SAVE20");
  const title = previewText(isSample, form.couponTitle.trim(), "20% off your first order");
  const description = previewText(
    isSample,
    form.couponDescription.trim(),
    "Valid on full-price items. One use per customer.",
  );
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
        {title && (
          <p className="mt-1 font-heading text-[18px] font-semibold leading-tight text-white">
            {title}
          </p>
        )}
        {description && (
          <p className="mt-1 text-[11px] text-white/85">{description}</p>
        )}
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
        {code && (
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
        )}
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
  const isSample = isPreviewSampleMode(form);
  const url = previewText(isSample, form.url.trim(), "https://your-site.com");

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
        {url && (
          <span
            className={cn(
              "truncate rounded-full px-2.5 py-1 text-[11px] ring-1",
              dark
                ? "bg-white/10 text-neutral-300 ring-white/10"
                : "bg-white text-neutral-500 ring-black/5",
            )}
          >
            {url}
          </span>
        )}
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
