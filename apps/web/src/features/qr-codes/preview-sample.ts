import type { QrFormState } from "@/features/qr-codes/components/qr-form";
import { emptyOpeningHours, type OpeningHours } from "@/lib/qr-codes/business";

function hasText(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}

/** Show full placeholder preview when true; otherwise only render entered content. */
export function isPreviewSampleMode(form: QrFormState): boolean {
  switch (form.type) {
    case "VCARD":
      return !(
        hasText(form.companyName) ||
        hasText(form.organization) ||
        hasText(form.fullName) ||
        hasText(form.businessTitle) ||
        hasText(form.jobTitle) ||
        hasText(form.businessSubtitle) ||
        hasText(form.vcardImageUrl) ||
        hasText(form.ctaLabel) ||
        hasText(form.ctaUrl) ||
        hasText(form.address) ||
        hasText(form.locationLat) ||
        hasText(form.locationLng) ||
        hasText(form.contactName) ||
        hasText(form.phone) ||
        hasText(form.email) ||
        hasText(form.website) ||
        hasText(form.aboutCompany) ||
        form.businessLinks.some((link) => hasText(link.url)) ||
        form.facilities.length > 0 ||
        hasOpeningHoursCustomization(form.openingHours)
      );
    case "EVENT":
      return !(
        hasText(form.title) ||
        hasText(form.startAt) ||
        hasText(form.endAt) ||
        hasText(form.location) ||
        hasText(form.description) ||
        hasText(form.eventUrl)
      );
    case "PDF":
      return !(hasText(form.name) || hasText(form.fileName) || hasText(form.fileUrl));
    case "MENU":
      return !(
        hasText(form.venueName) ||
        hasText(form.menuSubtitle) ||
        form.menuItems.some((item) => hasText(item.name))
      );
    case "WIFI":
      return !(hasText(form.wifiSsid) || hasText(form.wifiPassword));
    case "SOCIAL":
      return !(
        hasText(form.socialTitle) ||
        hasText(form.socialSubtitle) ||
        hasText(form.socialImageUrl) ||
        form.socialLinks.some((link) => hasText(link.url))
      );
    case "COUPON":
      return !(
        hasText(form.couponCode) ||
        hasText(form.couponTitle) ||
        hasText(form.couponDescription) ||
        hasText(form.couponTerms) ||
        hasText(form.couponExpiresAt)
      );
    case "LINK":
      return !hasText(form.url);
    default:
      return true;
  }
}

export function previewText(isSample: boolean, value: string, sample: string): string {
  const trimmed = value.trim();
  if (trimmed) return trimmed;
  return isSample ? sample : "";
}

/** Render a section when showing sample data or when live content exists. */
export function showPreviewSection(isSample: boolean, hasLive: boolean): boolean {
  return isSample || hasLive;
}

function hoursEqual(a: OpeningHours, b: OpeningHours): boolean {
  for (const day of Object.keys(a) as (keyof OpeningHours)[]) {
    const left = a[day];
    const right = b[day];
    if (left.closed !== right.closed || left.slots.length !== right.slots.length) {
      return false;
    }
    for (let i = 0; i < left.slots.length; i += 1) {
      const slotA = left.slots[i];
      const slotB = right.slots[i];
      if (!slotA || !slotB || slotA.open !== slotB.open || slotA.close !== slotB.close) {
        return false;
      }
    }
  }
  return true;
}

export function hasOpeningHoursCustomization(hours: OpeningHours): boolean {
  return !hoursEqual(hours, emptyOpeningHours());
}
