"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Building2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  ImageIcon,
  InfoIcon,
  LayoutGridIcon,
  Link2Icon,
  Loader2Icon,
  MapPinIcon,
  MousePointerClickIcon,
  PlusIcon,
  Share2Icon,
  Trash2Icon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FormField } from "@/components/forms/form-field";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { emptySocialLink, type QrFormState } from "@/features/qr-codes/components/qr-form";
import { QrSocialIcon } from "@/features/qr-codes/components/qr-social-icon";
import {
  BUSINESS_FACILITY_META,
  WEEKDAYS,
  WEEKDAY_LABEL,
  type BusinessFacility,
  type DayHours,
  type Weekday,
} from "@/lib/qr-codes/business";
import { SOCIAL_PLATFORM_LABEL } from "@/lib/qr-codes/content";
import { MAX_SOCIAL_LINKS, SOCIAL_PLATFORMS, type SocialLink, type SocialPlatform } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";

type BusinessFieldsProps = {
  form: QrFormState;
  onChange: <K extends keyof QrFormState>(key: K, value: QrFormState[K]) => void;
};

type PlacePrediction = { placeId: string; description: string };

function FormSection({
  title,
  description,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-border">
      <CollapsibleTrigger className="flex w-full cursor-pointer items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        </span>
        <ChevronDownIcon
          className={cn(
            "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-3 py-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function BusinessFields({ form, onChange }: BusinessFieldsProps) {
  return (
    <div className="space-y-3">
      <BasicsBlock form={form} onChange={onChange} />
      <FormSection
        title="Opening hours"
        description="Set weekly hours for your venue."
        icon={<ClockIcon className="size-4" />}
      >
        <OpeningHoursEditor
          value={form.openingHours}
          onChange={(value) => onChange("openingHours", value)}
        />
      </FormSection>
      <FormSection
        title="Location"
        description="Search with Google or enter an address manually."
        icon={<MapPinIcon className="size-4" />}
      >
        <LocationBlock form={form} onChange={onChange} />
      </FormSection>
      <FormSection
        title="Contact info"
        description="A contact person at the company."
        icon={<UserRoundIcon className="size-4" />}
      >
        <div className="space-y-3">
          <FormField
            id="qr-contact-name"
            label="Contact name"
            value={form.contactName}
            onChange={(value) => onChange("contactName", value)}
            placeholder="Jane Cooper"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              id="qr-phone"
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(value) => onChange("phone", value)}
              placeholder="+1 555 010 0100"
            />
            <FormField
              id="qr-email"
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => onChange("email", value)}
              placeholder="hello@acme.com"
            />
          </div>
          <FormField
            id="qr-website"
            label="Website"
            type="url"
            value={form.website}
            onChange={(value) => onChange("website", value)}
            placeholder="https://acme.com"
          />
        </div>
      </FormSection>
      <FormSection
        title="Social networks"
        description="Add profile links visitors can open."
        icon={<Share2Icon className="size-4" />}
      >
        <BusinessSocialLinks form={form} onChange={onChange} />
      </FormSection>
      <FormSection
        title="About company"
        description="A short story about your business."
        icon={<InfoIcon className="size-4" />}
      >
        <Field>
          <FieldLabel htmlFor="qr-about">About Us</FieldLabel>
          <FieldContent>
            <Textarea
              id="qr-about"
              value={form.aboutCompany}
              onChange={(event) => onChange("aboutCompany", event.target.value)}
              placeholder="Tell people what makes your business special…"
              rows={4}
            />
          </FieldContent>
        </Field>
      </FormSection>
      <FormSection
        title="Facilities"
        description="Choose amenities available at your venue."
        icon={<LayoutGridIcon className="size-4" />}
      >
        <FacilitiesPicker
          value={form.facilities}
          onChange={(value) => onChange("facilities", value)}
        />
      </FormSection>
    </div>
  );
}

function BasicsBlock({ form, onChange }: BusinessFieldsProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [ctaEnabled, setCtaEnabled] = useState(
    Boolean(form.ctaLabel.trim() || form.ctaUrl.trim()),
  );

  async function handleImageUpload(file: File) {
    setUploading(true);
    const toastId = toast.loading("Uploading photo…");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/qr-codes/upload-image", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      onChange("vcardImageUrl", data.imageUrl ?? "");
      toast.success("Photo uploaded", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload photo", {
        id: toastId,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Building2Icon className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">Business details</p>
          <p className="text-xs text-muted-foreground">
            Cover photo, name, and call-to-action for your landing page.
          </p>
        </div>
      </div>

      <Field>
        <FieldLabel>Cover photo</FieldLabel>
        <FieldContent>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImageUpload(file);
              event.target.value = "";
            }}
          />
          {form.vcardImageUrl ? (
            <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.vcardImageUrl}
                alt="Business cover"
                className="aspect-10/7 w-full object-cover"
              />
              <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove photo"
                  onClick={() => onChange("vcardImageUrl", "")}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <ImageIcon className="size-6 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                {uploading ? "Uploading…" : "Upload a photo"}
              </span>
              <span className="text-xs text-muted-foreground">
                Replaces the default graphic. JPEG, PNG, WebP, or GIF · up to 2 MB
              </span>
            </button>
          )}
        </FieldContent>
      </Field>

      <FormField
        id="qr-company-name"
        label="Company name"
        required
        value={form.companyName}
        onChange={(value) => onChange("companyName", value)}
        placeholder="Acme Consulting"
      />
      <FormField
        id="qr-business-title"
        label="Title"
        value={form.businessTitle}
        onChange={(value) => onChange("businessTitle", value)}
        placeholder="Professional services for growing businesses"
        description="Shown in the hero area at the top of the page."
      />
      <FormField
        id="qr-business-subtitle"
        label="Subtitle"
        value={form.businessSubtitle}
        onChange={(value) => onChange("businessSubtitle", value)}
        placeholder="Clear advice, reliable support, and results your team can count on."
      />

      <div className="rounded-xl border border-border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MousePointerClickIcon className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Call-to-action button</p>
              <p className="text-xs text-muted-foreground">
                Add a button visitors can tap on your page.
              </p>
            </div>
          </div>
          <Switch
            checked={ctaEnabled}
            onCheckedChange={(checked) => {
              setCtaEnabled(checked);
              if (!checked) {
                onChange("ctaLabel", "");
                onChange("ctaUrl", "");
              } else if (!form.ctaLabel.trim()) {
                onChange("ctaLabel", "Learn more");
              }
            }}
          />
        </div>
        {ctaEnabled && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <FormField
              id="qr-cta-label"
              label="Button text"
              value={form.ctaLabel}
              onChange={(value) => onChange("ctaLabel", value)}
              placeholder="Book a consultation"
            />
            <FormField
              id="qr-cta-url"
              label="Button link"
              type="url"
              value={form.ctaUrl}
              onChange={(value) => onChange("ctaUrl", value)}
              placeholder="https://acmeconsulting.com/contact"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function OpeningHoursEditor({
  value,
  onChange,
}: {
  value: QrFormState["openingHours"];
  onChange: (value: QrFormState["openingHours"]) => void;
}) {
  function updateDay(day: Weekday, patch: Partial<DayHours>) {
    onChange({ ...value, [day]: { ...value[day], ...patch } });
  }

  function updateSlot(day: Weekday, index: number, key: "open" | "close", next: string) {
    const slots = value[day].slots.map((slot, i) =>
      i === index ? { ...slot, [key]: next } : slot,
    );
    updateDay(day, { slots });
  }

  return (
    <div className="space-y-2">
      {WEEKDAYS.map((day) => {
        const dayHours = value[day];
        return (
          <div
            key={day}
            className="rounded-lg border border-border/80 bg-muted/10 px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{WEEKDAY_LABEL[day]}</p>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Closed
                <Switch
                  checked={dayHours.closed}
                  onCheckedChange={(closed) => updateDay(day, { closed })}
                />
              </label>
            </div>
            {!dayHours.closed && (
              <div className="mt-2 space-y-2">
                {dayHours.slots.map((slot, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <Input
                      type="time"
                      value={slot.open}
                      onChange={(event) => updateSlot(day, index, "open", event.target.value)}
                      className="h-8 w-[7.5rem]"
                      aria-label={`${WEEKDAY_LABEL[day]} opens`}
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={slot.close}
                      onChange={(event) => updateSlot(day, index, "close", event.target.value)}
                      className="h-8 w-[7.5rem]"
                      aria-label={`${WEEKDAY_LABEL[day]} closes`}
                    />
                    {dayHours.slots.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove time slot"
                        onClick={() =>
                          updateDay(day, {
                            slots: dayHours.slots.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
                {dayHours.slots.length < 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() =>
                      updateDay(day, {
                        slots: [...dayHours.slots, { open: "14:00", close: "17:00" }],
                      })
                    }
                  >
                    <PlusIcon className="size-3.5" />
                    Add time range
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <FieldDescription>
        Use time pickers for each day. Add a second range for split shifts.
      </FieldDescription>
    </div>
  );
}

function LocationBlock({ form, onChange }: BusinessFieldsProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [placesConfigured, setPlacesConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setPredictions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const response = await fetch(
            `/api/places/autocomplete?input=${encodeURIComponent(query.trim())}`,
          );
          const data = await response.json();
          setPlacesConfigured(data.configured !== false);
          setPredictions(Array.isArray(data.predictions) ? data.predictions : []);
        } catch {
          setPredictions([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  async function selectPlace(prediction: PlacePrediction) {
    setSearching(true);
    try {
      const response = await fetch(
        `/api/places/autocomplete?placeId=${encodeURIComponent(prediction.placeId)}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load place");
      onChange("address", data.place?.address ?? prediction.description);
      onChange(
        "locationLat",
        data.place?.lat != null ? String(data.place.lat) : "",
      );
      onChange(
        "locationLng",
        data.place?.lng != null ? String(data.place.lng) : "",
      );
      setQuery("");
      setPredictions([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load place");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel htmlFor="qr-location-search">Search location</FieldLabel>
        <FieldContent>
          <div className="relative">
            <MapPinIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="qr-location-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Google Places…"
              className="pl-8"
            />
            {searching && (
              <Loader2Icon className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {placesConfigured === false && (
            <FieldDescription>
              Google Places isn&apos;t configured. Enter the address manually below.
            </FieldDescription>
          )}
          {predictions.length > 0 && (
            <ul className="mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-sm">
              {predictions.map((prediction) => (
                <li key={prediction.placeId}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60"
                    onClick={() => void selectPlace(prediction)}
                  >
                    <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span>{prediction.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="qr-address">Address</FieldLabel>
        <FieldContent>
          <Textarea
            id="qr-address"
            value={form.address}
            onChange={(event) => {
              onChange("address", event.target.value);
              onChange("locationLat", "");
              onChange("locationLng", "");
            }}
            placeholder="123 Market St, San Francisco, CA"
            rows={2}
          />
          <FieldDescription>You can always type or paste an address manually.</FieldDescription>
        </FieldContent>
      </Field>
    </div>
  );
}

function BusinessSocialLinks({ form, onChange }: BusinessFieldsProps) {
  const atLimit = form.businessLinks.length >= MAX_SOCIAL_LINKS;

  function updateLink(index: number, patch: Partial<SocialLink>) {
    onChange(
      "businessLinks",
      form.businessLinks.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    );
  }

  function addLink(platform: SocialPlatform) {
    if (atLimit) {
      toast.error(`You can add up to ${MAX_SOCIAL_LINKS} social links`);
      return;
    }
    onChange("businessLinks", [...form.businessLinks, emptySocialLink(platform)]);
  }

  function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= form.businessLinks.length) return;
    const next = [...form.businessLinks];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    onChange("businessLinks", next);
  }

  return (
    <div className="space-y-3">
      {form.businessLinks.map((link, index) => (
        <div
          key={`${link.platform}-${index}`}
          className="space-y-3 rounded-xl border border-border bg-muted/20 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <QrSocialIcon platform={link.platform} size={36} />
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Move link up"
                disabled={index === 0}
                onClick={() => moveLink(index, -1)}
                className="border-sky-500/40 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300"
              >
                <ChevronUpIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Move link down"
                disabled={index === form.businessLinks.length - 1}
                onClick={() => moveLink(index, 1)}
                className="border-sky-500/40 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300"
              >
                <ChevronDownIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Remove link"
                onClick={() =>
                  onChange(
                    "businessLinks",
                    form.businessLinks.filter((_, i) => i !== index),
                  )
                }
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              id={`qr-biz-social-url-${index}`}
              label="URL"
              type="url"
              required
              value={link.url}
              onChange={(value) => updateLink(index, { url: value })}
              placeholder="E.g. https://instagram.com/yourbrand"
            />
            <FormField
              id={`qr-biz-social-label-${index}`}
              label="Text"
              value={link.label ?? ""}
              onChange={(value) => updateLink(index, { label: value })}
              placeholder="E.g. Follow us"
            />
          </div>
        </div>
      ))}

      <div
        className={cn(
          "rounded-xl border border-border bg-muted/10 p-2.5",
          atLimit && "opacity-60",
        )}
      >
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link2Icon className="size-3.5" />
          Click a platform to add a link
        </div>
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
          {SOCIAL_PLATFORMS.map((platform) => (
            <button
              key={platform}
              type="button"
              disabled={atLimit}
              title={SOCIAL_PLATFORM_LABEL[platform]}
              aria-label={`Add ${SOCIAL_PLATFORM_LABEL[platform]}`}
              onClick={() => addLink(platform)}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-lg border border-border/70 bg-background p-2 transition-colors",
                "hover:border-primary/40 hover:bg-muted/50",
                "disabled:cursor-not-allowed disabled:hover:border-border/70 disabled:hover:bg-background",
              )}
            >
              <QrSocialIcon platform={platform} size={28} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FacilitiesPicker({
  value,
  onChange,
}: {
  value: BusinessFacility[];
  onChange: (value: BusinessFacility[]) => void;
}) {
  function toggle(id: BusinessFacility) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    onChange([...value, id]);
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BUSINESS_FACILITY_META.map((facility) => {
          const active = value.includes(facility.id);
          return (
            <button
              key={facility.id}
              type="button"
              onClick={() => toggle(facility.id)}
              aria-pressed={active}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-xl border bg-background px-2 py-3 text-center transition-colors",
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-full",
                  active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                <facility.icon className="size-5" strokeWidth={1.75} />
              </span>
              <span className="text-xs font-medium leading-tight">{facility.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {value.length === 0
          ? "Tap amenities to show them on your page."
          : `${value.length} selected`}
      </p>
    </div>
  );
}
