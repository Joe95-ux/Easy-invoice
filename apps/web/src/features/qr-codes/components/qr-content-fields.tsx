"use client";

import { useRef, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/form-field";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BusinessFields } from "@/features/qr-codes/components/qr-business-fields";
import { QrDateTimeField } from "@/features/qr-codes/components/qr-datetime-field";
import {
  emptyMenuItem,
  emptySocialLink,
  type QrFormState,
} from "@/features/qr-codes/components/qr-form";
import { QrSocialIcon } from "@/features/qr-codes/components/qr-social-icon";
import { DatePicker } from "@/components/forms/date-picker";
import {
  SOCIAL_PLATFORM_LABEL,
  WIFI_ENCRYPTION_LABEL,
} from "@/lib/qr-codes/content";
import type {
  MenuItem,
  SocialLink,
  SocialPlatform,
  WifiEncryption,
} from "@/lib/qr-codes/types";
import { MAX_SOCIAL_LINKS, SOCIAL_PLATFORMS } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";

type QrContentFieldsProps = {
  form: QrFormState;
  onChange: <K extends keyof QrFormState>(key: K, value: QrFormState[K]) => void;
};

export function QrContentFields({ form, onChange }: QrContentFieldsProps) {
  if (form.type === "LINK") {
    return (
      <FormField
        id="qr-url"
        label="Website URL"
        type="url"
        required
        value={form.url}
        onChange={(value) => onChange("url", value)}
        placeholder="https://your-site.com"
        description="Scanners open this address. You can change it anytime without reprinting."
      />
    );
  }

  if (form.type === "PDF") {
    return <PdfUploadField form={form} onChange={onChange} />;
  }

  if (form.type === "MENU") {
    return <MenuFields form={form} onChange={onChange} />;
  }

  if (form.type === "WIFI") {
    return <WifiFields form={form} onChange={onChange} />;
  }

  if (form.type === "SOCIAL") {
    return <SocialFields form={form} onChange={onChange} />;
  }

  if (form.type === "COUPON") {
    return <CouponFields form={form} onChange={onChange} />;
  }

  if (form.type === "VCARD") {
    return <BusinessFields form={form} onChange={onChange} />;
  }

  // EVENT
  return (
    <div className="space-y-4">
      <FormField
        id="qr-event-title"
        label="Event title"
        required
        value={form.title}
        onChange={(value) => onChange("title", value)}
        placeholder="Product launch party"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <QrDateTimeField
          id="qr-start"
          label="Starts"
          required
          value={form.startAt}
          onChange={(value) => onChange("startAt", value)}
        />
        <QrDateTimeField
          id="qr-end"
          label="Ends"
          value={form.endAt}
          onChange={(value) => onChange("endAt", value)}
        />
      </div>
      <FormField
        id="qr-location"
        label="Location"
        value={form.location}
        onChange={(value) => onChange("location", value)}
        placeholder="The Grand Hall, 5th Ave"
      />
      <FormField
        id="qr-event-url"
        label="More info link"
        type="url"
        value={form.eventUrl}
        onChange={(value) => onChange("eventUrl", value)}
        placeholder="https://tickets.com/event"
      />
      <Field>
        <FieldLabel htmlFor="qr-event-desc">Description</FieldLabel>
        <FieldContent>
          <Textarea
            id="qr-event-desc"
            value={form.description}
            onChange={(event) => onChange("description", event.target.value)}
            placeholder="Details attendees should know."
            rows={3}
          />
        </FieldContent>
      </Field>
    </div>
  );
}

function MenuFields({ form, onChange }: QrContentFieldsProps) {
  function updateItem(index: number, patch: Partial<MenuItem>) {
    const next = form.menuItems.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    onChange("menuItems", next);
  }

  function addItem() {
    onChange("menuItems", [...form.menuItems, emptyMenuItem()]);
  }

  function removeItem(index: number) {
    if (form.menuItems.length <= 1) {
      onChange("menuItems", [emptyMenuItem()]);
      return;
    }
    onChange(
      "menuItems",
      form.menuItems.filter((_, i) => i !== index),
    );
  }

  return (
    <div className="space-y-4">
      <FormField
        id="qr-venue"
        label="Venue name"
        required
        value={form.venueName}
        onChange={(value) => onChange("venueName", value)}
        placeholder="The Corner Bistro"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="qr-menu-subtitle"
          label="Tagline"
          value={form.menuSubtitle}
          onChange={(value) => onChange("menuSubtitle", value)}
          placeholder="Seasonal plates & natural wine"
        />
        <FormField
          id="qr-menu-currency"
          label="Currency symbol"
          value={form.menuCurrency}
          onChange={(value) => onChange("menuCurrency", value)}
          placeholder="$"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Menu items</p>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <PlusIcon className="size-4" />
            Add item
          </Button>
        </div>
        {form.menuItems.map((item, index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-border bg-muted/20 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                Item {index + 1}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove item"
                onClick={() => removeItem(index)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
              <FormField
                id={`qr-item-name-${index}`}
                label="Name"
                required
                value={item.name}
                onChange={(value) => updateItem(index, { name: value })}
                placeholder="Heirloom tomato salad"
              />
              <FormField
                id={`qr-item-price-${index}`}
                label="Price"
                value={item.price ?? ""}
                onChange={(value) => updateItem(index, { price: value })}
                placeholder="14"
              />
            </div>
            <FormField
              id={`qr-item-section-${index}`}
              label="Section"
              value={item.section ?? ""}
              onChange={(value) => updateItem(index, { section: value })}
              placeholder="Starters"
              description="Optional — groups items on the menu page."
            />
            <Field>
              <FieldLabel htmlFor={`qr-item-desc-${index}`}>Description</FieldLabel>
              <FieldContent>
                <Textarea
                  id={`qr-item-desc-${index}`}
                  value={item.description ?? ""}
                  onChange={(event) =>
                    updateItem(index, { description: event.target.value })
                  }
                  placeholder="Optional short description"
                  rows={2}
                />
              </FieldContent>
            </Field>
          </div>
        ))}
      </div>
    </div>
  );
}

function WifiFields({ form, onChange }: QrContentFieldsProps) {
  const needsPassword = form.wifiEncryption !== "nopass";

  return (
    <div className="space-y-4">
      <FormField
        id="qr-wifi-ssid"
        label="Network name (SSID)"
        required
        value={form.wifiSsid}
        onChange={(value) => onChange("wifiSsid", value)}
        placeholder="CornerBistro-Guest"
      />
      <Field>
        <FieldLabel htmlFor="qr-wifi-encryption">Security</FieldLabel>
        <FieldContent>
          <Select
            value={form.wifiEncryption}
            onValueChange={(value) => {
              if (!value) return;
              onChange("wifiEncryption", value as WifiEncryption);
              if (value === "nopass") onChange("wifiPassword", "");
            }}
          >
            <SelectTrigger id="qr-wifi-encryption" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(WIFI_ENCRYPTION_LABEL) as WifiEncryption[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {WIFI_ENCRYPTION_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>
      {needsPassword && (
        <Field>
          <FieldLabel htmlFor="qr-wifi-password">Password</FieldLabel>
          <FieldContent>
            <Input
              id="qr-wifi-password"
              type="text"
              value={form.wifiPassword}
              onChange={(event) => onChange("wifiPassword", event.target.value)}
              placeholder="Network password"
              autoComplete="off"
            />
            <FieldDescription>
              Shown on the landing page so guests can copy and join.
            </FieldDescription>
          </FieldContent>
        </Field>
      )}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Hidden network</p>
          <p className="text-sm text-muted-foreground">
            Enable if the SSID is not broadcast publicly.
          </p>
        </div>
        <Switch
          checked={form.wifiHidden}
          onCheckedChange={(checked) => onChange("wifiHidden", checked)}
        />
      </div>
    </div>
  );
}

function SocialFields({ form, onChange }: QrContentFieldsProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const atLinkLimit = form.socialLinks.length >= MAX_SOCIAL_LINKS;

  function updateLink(index: number, patch: Partial<SocialLink>) {
    const next = form.socialLinks.map((link, i) =>
      i === index ? { ...link, ...patch } : link,
    );
    onChange("socialLinks", next);
  }

  function addLink(platform: SocialPlatform) {
    if (atLinkLimit) {
      toast.error(`You can add up to ${MAX_SOCIAL_LINKS} social links`);
      return;
    }
    onChange("socialLinks", [...form.socialLinks, emptySocialLink(platform)]);
  }

  function removeLink(index: number) {
    onChange(
      "socialLinks",
      form.socialLinks.filter((_, i) => i !== index),
    );
  }

  function moveLink(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= form.socialLinks.length) return;
    const next = [...form.socialLinks];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    onChange("socialLinks", next);
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
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
      onChange("socialImageUrl", data.imageUrl ?? "");
      toast.success("Photo uploaded", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload photo", {
        id: toastId,
      });
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <div className="space-y-4">
      <FormField
        id="qr-social-title"
        label="Page title"
        required
        value={form.socialTitle}
        onChange={(value) => onChange("socialTitle", value)}
        placeholder="Follow Acme Studio"
      />
      <FormField
        id="qr-social-subtitle"
        label="Tagline"
        value={form.socialSubtitle}
        onChange={(value) => onChange("socialSubtitle", value)}
        placeholder="Find us on your favorite apps"
      />

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
          {form.socialImageUrl ? (
            <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.socialImageUrl}
                alt="Social cover"
                className="aspect-10/7 w-full object-cover"
              />
              <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove photo"
                  onClick={() => onChange("socialImageUrl", "")}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploadingImage}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadingImage ? (
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <ImageIcon className="size-6 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                {uploadingImage ? "Uploading…" : "Upload a photo"}
              </span>
              <span className="text-xs text-muted-foreground">
                Replaces the graphic above your links. JPEG, PNG, WebP, or GIF · up to 2 MB
              </span>
            </button>
          )}
        </FieldContent>
      </Field>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Social links</p>
          <p className="text-xs text-muted-foreground">
            Click a platform to add a link. Up to {MAX_SOCIAL_LINKS}.
          </p>
        </div>

        {form.socialLinks.map((link, index) => (
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
                  disabled={index === form.socialLinks.length - 1}
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
                  onClick={() => removeLink(index)}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                id={`qr-social-url-${index}`}
                label="URL"
                type="url"
                required
                value={link.url}
                onChange={(value) => updateLink(index, { url: value })}
                placeholder="E.g. https://socialnetworks.com/"
              />
              <FormField
                id={`qr-social-label-${index}`}
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
            atLinkLimit && "opacity-60",
          )}
        >
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
            {SOCIAL_PLATFORMS.map((platform) => (
              <button
                key={platform}
                type="button"
                disabled={atLinkLimit}
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
          {atLinkLimit ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Maximum of {MAX_SOCIAL_LINKS} links reached. Remove one to add another.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CouponFields({ form, onChange }: QrContentFieldsProps) {
  return (
    <div className="space-y-4">
      <FormField
        id="qr-coupon-code"
        label="Coupon code"
        required
        value={form.couponCode}
        onChange={(value) => onChange("couponCode", value)}
        placeholder="SAVE20"
        description="Shown large on the landing page so guests can copy it."
      />
      <FormField
        id="qr-coupon-title"
        label="Offer title"
        value={form.couponTitle}
        onChange={(value) => onChange("couponTitle", value)}
        placeholder="20% off your first order"
      />
      <Field>
        <FieldLabel htmlFor="qr-coupon-desc">Description</FieldLabel>
        <FieldContent>
          <Textarea
            id="qr-coupon-desc"
            value={form.couponDescription}
            onChange={(event) => onChange("couponDescription", event.target.value)}
            placeholder="Valid on full-price items. One use per customer."
            rows={2}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel>Expires</FieldLabel>
        <FieldContent>
          <DatePicker
            value={form.couponExpiresAt || undefined}
            onChange={(value) => onChange("couponExpiresAt", value)}
            placeholder="No expiry"
          />
          <FieldDescription>Optional. Leave empty for no expiration date.</FieldDescription>
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="qr-coupon-terms">Terms</FieldLabel>
        <FieldContent>
          <Textarea
            id="qr-coupon-terms"
            value={form.couponTerms}
            onChange={(event) => onChange("couponTerms", event.target.value)}
            placeholder="Cannot be combined with other offers."
            rows={2}
          />
        </FieldContent>
      </Field>
    </div>
  );
}

function PdfUploadField({ form, onChange }: QrContentFieldsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    const toastId = toast.loading("Uploading PDF…");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/qr-codes/upload", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      onChange("fileUrl", data.fileUrl);
      onChange("fileName", data.fileName ?? file.name);
      onChange("filePublicId", data.filePublicId ?? "");
      onChange(
        "deliveryType",
        data.deliveryType === "authenticated" || data.deliveryType === "upload"
          ? data.deliveryType
          : "authenticated",
      );
      toast.success("PDF uploaded", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload PDF", {
        id: toastId,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Field>
      <FieldLabel>PDF document</FieldLabel>
      <FieldContent>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
        {form.fileUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {form.fileName || "Uploaded PDF"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove PDF"
              onClick={() => {
                onChange("fileUrl", "");
                onChange("fileName", "");
                onChange("filePublicId", "");
                onChange("deliveryType", "");
              }}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <UploadIcon className="size-6 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {uploading ? "Uploading…" : "Click to upload a PDF"}
            </span>
            <span className="text-xs text-muted-foreground">Up to 10 MB</span>
          </button>
        )}
        <FieldDescription>
          The document opens when the code is scanned. Swap it later without reprinting.
        </FieldDescription>
      </FieldContent>
    </Field>
  );
}
