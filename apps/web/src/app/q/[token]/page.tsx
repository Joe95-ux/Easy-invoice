import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BuildingIcon,
  CalendarIcon,
  DownloadIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { resolveRedirectUrl } from "@/lib/qr-codes/content";
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
  if (!qr) notFound();

  await recordQrScan(qr.id);

  const content = (qr.content ?? {}) as Record<string, unknown>;
  const target = resolveRedirectUrl(qr.type, content);
  if (target) redirect(target);

  if (qr.type === "VCARD") {
    const vcard = content as unknown as VcardContent;
    return (
      <Card className="overflow-hidden">
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
            <Button
              className="w-full"
              render={<Link href={`/q/${token}/vcf`} prefetch={false} />}
            >
              <DownloadIcon className="size-4" />
              Save contact
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (qr.type === "EVENT") {
    const event = content as unknown as EventContent;
    return (
      <Card className="overflow-hidden">
        <CardHeader className="items-center gap-3 border-b bg-muted/30 py-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarIcon className="size-7" />
          </div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {event.title}
          </h1>
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
            <Button
              className="w-full"
              render={<Link href={`/q/${token}/ics`} prefetch={false} />}
            >
              <DownloadIcon className="size-4" />
              Add to calendar
            </Button>
          </div>
        </CardContent>
      </Card>
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
