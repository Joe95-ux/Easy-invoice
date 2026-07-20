import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  DownloadIcon,
  GlobeIcon,
  InfoIcon,
  MailIcon,
  MapPinIcon,
  PauseCircleIcon,
  PhoneIcon,
  Share2Icon,
  TicketPercentIcon,
  UtensilsCrossedIcon,
  WifiIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { QrCouponCopy } from "@/features/qr-codes/components/qr-coupon-copy";
import { BusinessActionsFab } from "@/features/qr-codes/components/qr-business-actions";
import { QrPasswordGate } from "@/features/qr-codes/components/qr-password-gate";
import { QrPublicThemeToggle } from "@/features/qr-codes/components/qr-public-theme-toggle";
import { QrSocialIcon } from "@/features/qr-codes/components/qr-social-icon";
import { QrWifiConnect } from "@/features/qr-codes/components/qr-wifi-connect";
import {
  BUSINESS_FACILITY_META,
  WEEKDAY_LABEL,
  formatTimeLabel,
  isOpenNow,
  type Weekday,
} from "@/lib/qr-codes/business";
import {
  SOCIAL_PLATFORM_LABEL,
  WIFI_ENCRYPTION_LABEL,
  resolveRedirectUrl,
} from "@/lib/qr-codes/content";
import {
  resolveBusinessLandingColors,
} from "@/lib/qr-codes/design";
import { qrUnlockCookieName, qrUnlockToken } from "@/lib/qr-codes/password";
import { getQrCodeByToken, recordQrScan } from "@/lib/qr-codes/service";
import type {
  CouponContent,
  EventContent,
  MenuContent,
  MenuItem,
  SocialContent,
  SocialPlatform,
  VcardContent,
  WifiContent,
} from "@/lib/qr-codes/types";
import { SOCIAL_PLATFORMS } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ token: string }> };

function formatEventDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export default async function QrScanPage({ params }: PageProps) {
  const { token } = await params;
  const qr = await getQrCodeByToken(token);
  if (!qr || qr.status === "DELETED") notFound();

  if (qr.status === "PAUSED") {
    return (
      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <PauseCircleIcon className="size-7" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-semibold tracking-tight">
              This QR code is paused
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              It&apos;s temporarily unavailable. Please check back later.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (qr.passwordHash) {
    const cookieStore = await cookies();
    const unlocked =
      cookieStore.get(qrUnlockCookieName(qr.id))?.value ===
      qrUnlockToken(qr.id, qr.passwordHash);
    if (!unlocked) {
      return <QrPasswordGate token={token} name={qr.name} />;
    }
  }

  // PDF is served through a gated proxy so CDN URLs can't bypass controls.
  if (qr.type === "PDF") {
    redirect(`/q/${token}/file`);
  }

  await recordQrScan(qr.id);

  const content = (qr.content ?? {}) as Record<string, unknown>;
  const target = resolveRedirectUrl(qr.type, content);
  if (target) redirect(target);

  if (qr.type === "VCARD") {
    const vcard = content as unknown as VcardContent;
    const companyName =
      vcard.companyName?.trim() ||
      vcard.organization?.trim() ||
      vcard.fullName?.trim() ||
      "Business";
    const headline = vcard.title?.trim() || vcard.jobTitle?.trim() || companyName;
    const subtitle = vcard.subtitle?.trim();
    const coverImage = vcard.imageUrl?.trim() || "/business-cover.jpg";
    const ctaLabel = vcard.ctaLabel?.trim();
    const ctaUrl = vcard.ctaUrl?.trim();
    const openNow = isOpenNow(vcard.openingHours);
    const weekdayToday = (
      ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const
    )[new Date().getDay()] as Weekday;
    const todayHours = vcard.openingHours?.[weekdayToday];
    const facilities = (vcard.facilities ?? [])
      .map((id) => BUSINESS_FACILITY_META.find((item) => item.id === id))
      .filter(Boolean);
    const links = (vcard.links ?? []).filter((link) => link?.url?.trim());
    const mapsUrl =
      vcard.locationLat != null && vcard.locationLng != null
        ? `https://www.google.com/maps/search/?api=1&query=${vcard.locationLat},${vcard.locationLng}`
        : vcard.address?.trim()
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vcard.address.trim())}`
          : null;
    const sectionCls = "rounded-[10px] border border-border bg-muted/20 px-3 py-3 shadow-none";
    const palette = resolveBusinessLandingColors(
      qr.design.fgColor,
      qr.design.bgColor,
    );

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <QrPublicThemeToggle />
        </div>
        <Card className="gap-0 overflow-hidden rounded-[10px] py-0 shadow-none">
          <div
            className="px-5 pb-28 pt-10 text-center"
            style={{ backgroundColor: palette.heroBg }}
          >
            <h1
              className="font-heading text-xl font-semibold tracking-tight"
              style={{ color: palette.heroText }}
            >
              {headline}
            </h1>
          </div>
          <CardContent className="relative z-10 -mt-[5.25rem] space-y-3 px-4 pb-12">
            <div className="overflow-hidden rounded-[10px] border border-border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImage}
                alt=""
                className="aspect-10/7 w-full object-cover"
              />
              <div className="space-y-3 p-4">
                <div>
                  <h2 className="font-heading text-lg font-semibold tracking-tight">
                    {companyName}
                  </h2>
                  {subtitle && (
                    <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                  )}
                </div>
                {ctaLabel && ctaUrl ? (
                  <Button
                    className="w-full cursor-pointer rounded-[10px] hover:opacity-90"
                    style={{
                      backgroundColor: palette.ctaBg,
                      color: palette.ctaText,
                    }}
                    render={<a href={ctaUrl} target="_blank" rel="noreferrer" />}
                  >
                    {ctaLabel}
                  </Button>
                ) : null}
              </div>
            </div>

            {todayHours && (
              <div className={sectionCls}>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-muted text-muted-foreground [&_svg]:size-3.5">
                    <ClockIcon />
                  </span>
                  <p className="text-sm">
                    Open hours —{" "}
                    <span
                      className="font-semibold"
                      style={
                        openNow
                          ? { color: palette.accent }
                          : undefined
                      }
                    >
                      {openNow ? "Open now" : todayHours.closed ? "Closed today" : "See hours"}
                    </span>
                  </p>
                </div>
                {!todayHours.closed && todayHours.slots.length > 0 && (
                  <div className="mt-2 space-y-0.5 pl-[2.375rem] text-sm text-muted-foreground">
                    <p className="font-medium text-foreground/80">
                      {WEEKDAY_LABEL[weekdayToday]}:
                    </p>
                    {todayHours.slots.map((slot, index) => (
                      <p key={index}>
                        {formatTimeLabel(slot.open)} - {formatTimeLabel(slot.close)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {vcard.address?.trim() && (
              <div className={cn(sectionCls, "flex items-start gap-2.5")}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-muted text-muted-foreground [&_svg]:size-3.5">
                  <MapPinIcon />
                </span>
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="cursor-pointer pt-1 text-sm leading-relaxed text-muted-foreground underline-offset-2 hover:underline"
                  >
                    {vcard.address.trim()}
                  </a>
                ) : (
                  <p className="pt-1 text-sm leading-relaxed text-muted-foreground">
                    {vcard.address.trim()}
                  </p>
                )}
              </div>
            )}

            {facilities.length > 0 && (
              <div className={sectionCls}>
                <p className="mb-2 text-sm font-medium">Facilities</p>
                <div className="grid grid-cols-5 gap-2">
                  {facilities.map((facility) =>
                    facility ? (
                      <div
                        key={facility.id}
                        className="flex cursor-pointer flex-col items-center gap-1"
                        title={facility.label}
                      >
                        <span className="flex size-10 items-center justify-center rounded-[10px] bg-muted text-foreground">
                          <facility.icon className="size-4" strokeWidth={1.75} />
                        </span>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            )}

            {links.length > 0 && (
              <div className="space-y-2">
                {links.map((link, index) => {
                  const platform = (
                    SOCIAL_PLATFORMS.includes(link.platform as SocialPlatform)
                      ? link.platform
                      : "other"
                  ) as SocialPlatform;
                  const text = link.label?.trim();
                  return (
                    <a
                      key={`${link.url}-${index}`}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-border bg-muted/30 px-3 py-3 transition-colors hover:bg-muted/60"
                    >
                      <QrSocialIcon platform={platform} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {SOCIAL_PLATFORM_LABEL[platform]}
                        </span>
                        {text && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {text}
                          </span>
                        )}
                      </span>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </a>
                  );
                })}
              </div>
            )}

            {vcard.about?.trim() && (
              <div className={sectionCls}>
                <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                  <InfoIcon className="size-4 text-muted-foreground" />
                  About Us
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {vcard.about.trim()}
                </p>
              </div>
            )}

            {(vcard.contactName?.trim() ||
              vcard.phone?.trim() ||
              vcard.email?.trim() ||
              vcard.website?.trim()) && (
              <div className={cn(sectionCls, "space-y-2")}>
                {vcard.contactName?.trim() && (
                  <p className="text-sm font-medium">{vcard.contactName.trim()}</p>
                )}
                {vcard.phone?.trim() && (
                  <a
                    href={`tel:${vcard.phone}`}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-muted text-muted-foreground [&_svg]:size-3.5">
                      <PhoneIcon />
                    </span>
                    {vcard.phone}
                  </a>
                )}
                {vcard.email?.trim() && (
                  <a
                    href={`mailto:${vcard.email}`}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-muted text-muted-foreground [&_svg]:size-3.5">
                      <MailIcon />
                    </span>
                    {vcard.email}
                  </a>
                )}
                {vcard.website?.trim() && (
                  <a
                    href={
                      /^https?:\/\//i.test(vcard.website.trim())
                        ? vcard.website.trim()
                        : `https://${vcard.website.trim()}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-muted text-muted-foreground [&_svg]:size-3.5">
                      <GlobeIcon />
                    </span>
                    {vcard.website}
                  </a>
                )}
              </div>
            )}

            <Button className="w-full cursor-pointer rounded-[10px]" variant="outline" render={<a href={`/q/${token}/vcf`} />}>
              <DownloadIcon className="size-4" />
              Save contact
            </Button>
          </CardContent>
        </Card>
        <BusinessActionsFab
          phone={vcard.phone?.trim() || ""}
          email={vcard.email?.trim() || ""}
          website={vcard.website?.trim() || ""}
          companyName={companyName}
          actionBg={palette.heroBg}
          actionText={palette.heroText}
        />
      </div>
    );
  }

  if (qr.type === "EVENT") {
    const event = content as unknown as EventContent;
    const startDate = event.startAt ? new Date(event.startAt) : null;
    const validStart = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;
    const month = validStart
      ? validStart.toLocaleDateString(undefined, { month: "short" }).toUpperCase()
      : "";
    const day = validStart ? validStart.getDate() : "";

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <QrPublicThemeToggle />
        </div>
        <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="gap-0 border-b bg-gradient-to-br from-primary/12 via-primary/5 to-transparent py-6">
          <div className="flex items-center gap-4">
            {validStart && (
              <div className="flex w-14 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-background text-center shadow-sm">
                <span className="bg-primary py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                  {month}
                </span>
                <span className="py-1 font-heading text-2xl font-semibold leading-none">
                  {day}
                </span>
              </div>
            )}
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                Event
              </p>
              <h1 className="font-heading text-xl font-semibold leading-tight tracking-tight">
                {event.title}
              </h1>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 py-4">
          {event.startAt && (
            <ContactRow icon={<CalendarIcon className="size-4" />}>
              {formatEventDate(event.startAt)}
              {event.endAt ? ` – ${formatEventDate(event.endAt)}` : ""}
            </ContactRow>
          )}
          {event.location && (
            <ContactRow icon={<MapPinIcon className="size-4" />}>{event.location}</ContactRow>
          )}
          {event.url && (
            <ContactRow icon={<GlobeIcon className="size-4" />} href={event.url}>
              {event.url}
            </ContactRow>
          )}
          {event.description && (
            <p className="whitespace-pre-wrap px-2 pt-2 text-sm text-muted-foreground">
              {event.description}
            </p>
          )}
          <div className="pt-3">
            <Button className="w-full" render={<a href={`/q/${token}/ics`} />}>
              <DownloadIcon className="size-4" />
              Add to calendar
            </Button>
          </div>
        </CardContent>
        </Card>
      </div>
    );
  }

  if (qr.type === "MENU") {
    const menu = content as unknown as MenuContent;
    const currency = menu.currency?.trim() || "$";
    const sections = groupMenuItems(menu.items ?? []);

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <QrPublicThemeToggle />
        </div>
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="items-center gap-3 border-b bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <UtensilsCrossedIcon className="size-7" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-semibold tracking-tight">
                {menu.venueName}
              </h1>
              {menu.subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">{menu.subtitle}</p>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5 py-5">
            {sections.map((section) => (
              <div key={section.title} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-400">
                  {section.title}
                </p>
                <div className="space-y-2">
                  {section.items.map((item, index) => (
                    <div
                      key={`${section.title}-${item.name}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-lg px-1 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.name}</p>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.price && (
                        <p className="shrink-0 text-sm font-semibold tabular-nums">
                          {currency}
                          {item.price}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (qr.type === "WIFI") {
    const wifi = content as unknown as WifiContent;
    const encryptionLabel =
      WIFI_ENCRYPTION_LABEL[wifi.encryption] ?? wifi.encryption;

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <QrPublicThemeToggle />
        </div>
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="items-center gap-3 border-b bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
              <WifiIcon className="size-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
                Wi‑Fi access
              </p>
              <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight">
                {wifi.ssid}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{encryptionLabel}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 py-5">
            <QrWifiConnect ssid={wifi.ssid} password={wifi.password} />
            {wifi.hidden && (
              <p className="text-center text-xs text-muted-foreground">
                This is a hidden network — choose “Other…” and enter the name manually.
              </p>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Open your Wi‑Fi settings, select the network, and paste the password.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (qr.type === "SOCIAL") {
    const social = content as unknown as SocialContent;
    const links = (social.links ?? []).filter((link) => link?.url?.trim());
    const coverImage =
      typeof social.imageUrl === "string" ? social.imageUrl.trim() : "";

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <QrPublicThemeToggle />
        </div>
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="justify-items-center gap-3 border-b bg-gradient-to-br from-sky-500/15 via-indigo-500/5 to-transparent py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-400">
              <Share2Icon className="size-7" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-semibold tracking-tight">
                {social.title}
              </h1>
              {social.subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">{social.subtitle}</p>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 py-5">
            {coverImage ? (
              <div className="mb-3 overflow-hidden rounded-2xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImage}
                  alt=""
                  className="aspect-10/7 w-full object-cover"
                />
              </div>
            ) : null}
            {links.map((link, index) => {
              const platform = (
                SOCIAL_PLATFORMS.includes(link.platform as SocialPlatform)
                  ? link.platform
                  : "other"
              ) as SocialPlatform;
              const text = link.label?.trim();
              return (
                <a
                  key={`${link.url}-${index}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-3 transition-colors hover:bg-muted/60"
                >
                  <QrSocialIcon platform={platform} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {SOCIAL_PLATFORM_LABEL[platform] || "Open link"}
                    </span>
                    {text && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {text}
                      </span>
                    )}
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </a>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (qr.type === "COUPON") {
    const coupon = content as unknown as CouponContent;
    const expiresLabel = formatCouponExpiry(coupon.expiresAt);

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <QrPublicThemeToggle />
        </div>
        <Card className="gap-0 overflow-hidden py-0 shadow-sm">
          <CardHeader className="justify-items-center gap-3 border-b bg-gradient-to-br from-sky-500/20 via-sky-500/5 to-transparent py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-sky-600/15 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300">
              <TicketPercentIcon className="size-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300">
                Coupon
              </p>
              <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight">
                {coupon.title?.trim() || "Your offer"}
              </h1>
              {coupon.description && (
                <p className="mt-1 text-sm text-muted-foreground">{coupon.description}</p>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 py-5">
            <QrCouponCopy code={coupon.code} />
            {expiresLabel && (
              <p className="text-center text-sm text-muted-foreground">
                Expires {expiresLabel}
              </p>
            )}
            {coupon.terms && (
              <p className="whitespace-pre-wrap rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {coupon.terms}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  notFound();
}

function formatCouponExpiry(value?: string): string {
  if (!value) return "";
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function groupMenuItems(items: MenuItem[]) {
  const sections: { title: string; items: MenuItem[] }[] = [];
  const indexByTitle = new Map<string, number>();

  for (const item of items) {
    if (!item?.name?.trim()) continue;
    const title = item.section?.trim() || "Menu";
    const existing = indexByTitle.get(title);
    if (existing === undefined) {
      indexByTitle.set(title, sections.length);
      sections.push({ title, items: [item] });
    } else {
      sections[existing]!.items.push(item);
    }
  }

  return sections;
}

function ContactRow({
  icon,
  href,
  children,
}: {
  icon: React.ReactNode;
  href?: string;
  children: React.ReactNode;
}) {
  const body = (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-muted/60">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {body}
      </a>
    );
  }
  return body;
}
