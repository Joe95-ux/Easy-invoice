import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  BuildingIcon,
  CalendarIcon,
  DownloadIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PauseCircleIcon,
  PhoneIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { QrPasswordGate } from "@/features/qr-codes/components/qr-password-gate";
import { QrPublicThemeToggle } from "@/features/qr-codes/components/qr-public-theme-toggle";
import { resolveRedirectUrl } from "@/lib/qr-codes/content";
import { qrUnlockCookieName, qrUnlockToken } from "@/lib/qr-codes/password";
import { getQrCodeByToken, recordQrScan } from "@/lib/qr-codes/service";
import type { EventContent, VcardContent } from "@/lib/qr-codes/types";

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
      cookieStore.get(qrUnlockCookieName(qr.id))?.value === qrUnlockToken(qr.passwordHash);
    if (!unlocked) {
      return <QrPasswordGate token={token} name={qr.name} />;
    }
  }

  await recordQrScan(qr.id);

  const content = (qr.content ?? {}) as Record<string, unknown>;
  const target = resolveRedirectUrl(qr.type, content);
  if (target) redirect(target);

  if (qr.type === "VCARD") {
    const vcard = content as unknown as VcardContent;
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <QrPublicThemeToggle />
        </div>
        <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="items-center gap-3 border-b bg-muted/30 py-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BuildingIcon className="size-7" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              {vcard.fullName}
            </h1>
            {(vcard.jobTitle || vcard.organization) && (
              <p className="text-sm text-muted-foreground">
                {[vcard.jobTitle, vcard.organization].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-1 py-4">
          {vcard.phone && (
            <ContactRow icon={<PhoneIcon className="size-4" />} href={`tel:${vcard.phone}`}>
              {vcard.phone}
            </ContactRow>
          )}
          {vcard.email && (
            <ContactRow icon={<MailIcon className="size-4" />} href={`mailto:${vcard.email}`}>
              {vcard.email}
            </ContactRow>
          )}
          {vcard.website && (
            <ContactRow icon={<GlobeIcon className="size-4" />} href={vcard.website}>
              {vcard.website}
            </ContactRow>
          )}
          {vcard.address && (
            <ContactRow icon={<MapPinIcon className="size-4" />}>{vcard.address}</ContactRow>
          )}
          <div className="pt-3">
            <Button className="w-full" render={<a href={`/q/${token}/vcf`} />}>
              <DownloadIcon className="size-4" />
              Save contact
            </Button>
          </div>
        </CardContent>
        </Card>
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

  notFound();
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
